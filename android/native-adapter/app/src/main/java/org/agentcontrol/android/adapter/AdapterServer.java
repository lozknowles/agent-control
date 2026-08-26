package org.agentcontrol.android.adapter;

import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

final class AdapterServer {
    interface Delegate {
        boolean isNfcReady();
        JSONObject diagnostic() throws JSONException;
        void onWaitingForCard(String jobId);
        void onNfcJobStopped(String jobId, String reason);
        void onServerStatus(String status);
    }

    private static final int MAX_BODY = 16 * 1024;
    private static final int MAX_JOBS = 128;
    private static final int MAX_NONCES = 4096;
    private static final long REPLAY_WINDOW_MS = 60_000L;
    private final String nodeId;
    private final String instanceId;
    private final String token;
    private final int port;
    private final Delegate delegate;
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final Map<String, Long> nonces = new ConcurrentHashMap<>();
    private final ExecutorService requests = Executors.newFixedThreadPool(4);
    private final ScheduledExecutorService timers = Executors.newSingleThreadScheduledExecutor();
    private volatile ServerSocket listener;
    private volatile boolean running;

    AdapterServer(String nodeId, String instanceId, String token, int port, Delegate delegate) {
        this.nodeId = nodeId;
        this.instanceId = instanceId;
        this.token = token;
        this.port = port;
        this.delegate = delegate;
    }

    synchronized void start() throws IOException {
        if (running) throw new IOException("adapter_already_running");
        ServerSocket socket = new ServerSocket();
        socket.setReuseAddress(true);
        socket.bind(new InetSocketAddress("0.0.0.0", port));
        listener = socket;
        running = true;
        Thread acceptor = new Thread(this::acceptLoop, "agent-control-android-accept");
        acceptor.setDaemon(true);
        acceptor.start();
        delegate.onServerStatus("Listening on authenticated secure-overlay endpoint port " + port);
    }

    synchronized void stop(String reason) {
        running = false;
        try { if (listener != null) listener.close(); } catch (IOException ignored) {}
        for (Job job : jobs.values()) if (!job.terminal()) cancel(job, reason);
        requests.shutdownNow();
        timers.shutdownNow();
        delegate.onServerStatus("Disabled by human: " + reason);
    }

    void activityUnavailable() {
        for (Job job : jobs.values()) if ("WAITING_FOR_CARD".equals(job.status)) fail(job, "activity_not_foreground");
    }

    synchronized void completeNfc(JSONObject metadata) {
        Job active = jobs.values().stream().filter(job -> "WAITING_FOR_CARD".equals(job.status)).min(Comparator.comparing(job -> job.createdAt)).orElse(null);
        if (active == null) return;
        synchronized (active) {
            if (!"WAITING_FOR_CARD".equals(active.status)) return;
            active.transition("CARD_DETECTED");
            active.result = metadata;
            active.transition("SAFE_METADATA_READ");
            active.transition("RESULT_RETURNED");
            active.transition("JOB_COMPLETE");
        }
        delegate.onNfcJobStopped(active.id, "complete");
    }

    synchronized void failNfc(String reason) {
        Job active = jobs.values().stream().filter(job -> "WAITING_FOR_CARD".equals(job.status)).min(Comparator.comparing(job -> job.createdAt)).orElse(null);
        if (active != null) fail(active, reason);
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket socket = listener.accept();
                socket.setSoTimeout(5000);
                requests.submit(() -> handle(socket));
            } catch (IOException error) {
                if (running) delegate.onServerStatus("Endpoint error: " + safe(error.getMessage()));
            }
        }
    }

    private void handle(Socket socket) {
        try {
            if (!allowedSource(socket.getInetAddress())) { write(socket, 403, new JSONObject().put("error", "private_transport_source_required")); return; }
            Request request = read(socket.getInputStream());
            if ("GET".equals(request.method) && "/health".equals(request.path)) { write(socket, running ? 200 : 503, new JSONObject().put("schema", "agent-control.node-health/v1").put("status", running ? "ok" : "disabled").put("version", "3.1.0").put("enabled", running)); return; }
            if (!authenticated(request.headers.get("authorization"))) { write(socket, 401, new JSONObject().put("error", "unauthorized")); return; }
            if ("GET".equals(request.method) && "/v2/resource".equals(request.path)) { write(socket, 200, advertisement()); return; }
            if ("POST".equals(request.method) && "/v2/jobs".equals(request.path)) {
                String replay = replayError(request); if (replay != null) { write(socket, 409, new JSONObject().put("error", replay)); return; }
                JSONObject body = parseJson(request.body), response = createJob(body);
                write(socket, "WAITING_FOR_CARD".equals(response.optString("status")) ? 202 : 200, response); return;
            }
            String jobId = jobId(request.path);
            if (jobId != null && "GET".equals(request.method)) { Job job = jobs.get(jobId); write(socket, job == null ? 404 : 200, job == null ? new JSONObject().put("error", "job_not_found") : job.json()); return; }
            if (jobId != null && "DELETE".equals(request.method)) {
                String replay = replayError(request); if (replay != null) { write(socket, 409, new JSONObject().put("error", replay)); return; }
                Job job = jobs.get(jobId); if (job == null) { write(socket, 404, new JSONObject().put("error", "job_not_found")); return; }
                if (job.terminal()) { write(socket, 409, new JSONObject().put("error", "job_already_terminal")); return; }
                cancel(job, "agent_control_cancelled"); write(socket, 200, job.json()); return;
            }
            write(socket, 404, new JSONObject().put("error", "not_found"));
        } catch (HttpError error) {
            try { write(socket, error.status, new JSONObject().put("error", error.getMessage())); } catch (Exception ignored) {}
        } catch (Exception error) {
            try { write(socket, 500, new JSONObject().put("error", "internal_error")); } catch (Exception ignored) {}
        } finally { try { socket.close(); } catch (IOException ignored) {} }
    }

    private JSONObject advertisement() throws JSONException {
        JSONArray capabilities = new JSONArray();
        for (String id : capabilityIds()) capabilities.put(new JSONObject().put("id", id));
        JSONObject platform = new JSONObject().put("os", "android").put("version", Build.VERSION.RELEASE).put("sdk", Build.VERSION.SDK_INT).put("manufacturer", Build.MANUFACTURER).put("model", Build.MODEL);
        return new JSONObject()
                .put("schema", "agent-control.resource/v2").put("agentVersion", "3.1.0").put("observedAt", Instant.now().toString())
                .put("identity", new JSONObject().put("nodeId", nodeId).put("instanceId", instanceId).put("authenticated", true))
                .put("platform", platform)
                .put("resource", new JSONObject().put("id", nodeId).put("type", "host").put("health", running ? "healthy" : "degraded").put("capabilities", capabilities))
                .put("security", new JSONObject().put("authority", "agent-control-executor-only").put("jobs", "typed-allowlist").put("replayProtection", "request-id-and-timestamp").put("humanDisable", "on-device-stop-control"));
    }

    private List<String> capabilityIds() {
        List<String> values = new ArrayList<>();
        values.add("platform.android"); values.add("device.physical"); values.add("execution.android.typed_jobs"); values.add("android.system.inspect");
        if (delegate.isNfcReady()) { values.add("device.nfc"); values.add("device.nfc.reader"); values.add("nfc.inspect.read_only"); }
        return values;
    }

    private synchronized JSONObject createJob(JSONObject value) throws JSONException {
        if (!running) throw new HttpError(503, "node_disabled_by_human");
        String type = value.optString("type", "");
        Set<String> allowed = new HashSet<>(); allowed.add("type"); if ("nfc.inspect_tag".equals(type)) allowed.add("timeoutMs");
        java.util.Iterator<String> keys = value.keys();
        while (keys.hasNext()) if (!allowed.contains(keys.next())) throw new HttpError(400, "malformed_job");
        if (!"android.system.inspect".equals(type) && !"nfc.inspect_tag".equals(type)) throw new HttpError(403, "capability_not_authorized");
        pruneJobs();
        if (jobs.size() >= MAX_JOBS) throw new HttpError(429, "job_capacity_exhausted");
        Job job = new Job(UUID.randomUUID().toString(), type); jobs.put(job.id, job);
        if ("android.system.inspect".equals(type)) {
            job.transition("ROUTED_TO_ANDROID_NODE");
            job.result = delegate.diagnostic().put("schema", "agent-control.android-diagnostic/v1").put("policy", "read-only").put("nodeId", nodeId).put("observedAt", Instant.now().toString());
            job.transition("RESULT_RETURNED"); job.transition("JOB_COMPLETE"); return job.json();
        }
        if (!delegate.isNfcReady()) { jobs.remove(job.id); throw new HttpError(409, "nfc_reader_not_ready"); }
        if (jobs.values().stream().anyMatch(candidate -> candidate != job && "WAITING_FOR_CARD".equals(candidate.status))) { jobs.remove(job.id); throw new HttpError(409, "nfc_reader_busy"); }
        int timeoutMs = value.optInt("timeoutMs", 60_000);
        if (timeoutMs < 5000 || timeoutMs > 120_000) { jobs.remove(job.id); throw new HttpError(400, "nfc_timeout_invalid"); }
        job.transition("ROUTED_TO_ANDROID_NFC_NODE"); job.transition("WAITING_FOR_CARD");
        timers.schedule(() -> { if ("WAITING_FOR_CARD".equals(job.status)) { synchronized (job) { if ("WAITING_FOR_CARD".equals(job.status)) job.transition("TIMED_OUT"); } delegate.onNfcJobStopped(job.id, "timeout"); } }, timeoutMs, TimeUnit.MILLISECONDS);
        delegate.onWaitingForCard(job.id);
        return job.json();
    }

    private void cancel(Job job, String reason) { synchronized (job) { if (!job.terminal()) { job.error = safe(reason); job.transition("CANCELLED"); } } delegate.onNfcJobStopped(job.id, reason); }
    private void fail(Job job, String reason) { synchronized (job) { if (!job.terminal()) { job.error = safe(reason); job.transition("FAILED"); } } delegate.onNfcJobStopped(job.id, reason); }
    private void pruneJobs() { if (jobs.size() < MAX_JOBS) return; jobs.values().stream().filter(Job::terminal).sorted(Comparator.comparing(job -> job.createdAt)).limit(Math.max(1, jobs.size() - MAX_JOBS + 1L)).forEach(job -> jobs.remove(job.id)); }

    private boolean authenticated(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return false;
        return MessageDigest.isEqual(sha256(authorization.substring(7)), sha256(token));
    }

    private String replayError(Request request) {
        String id = request.headers.get("x-agent-control-request-id"), timestamp = request.headers.get("x-agent-control-timestamp");
        if (id == null || timestamp == null) return "replay_headers_required";
        try { UUID.fromString(id); } catch (IllegalArgumentException error) { return "replay_headers_required"; }
        long at; try { at = Instant.parse(timestamp).toEpochMilli(); } catch (Exception error) { return "request_timestamp_stale"; }
        long current = System.currentTimeMillis(); nonces.entrySet().removeIf(entry -> current - entry.getValue() > REPLAY_WINDOW_MS);
        if (Math.abs(current - at) > REPLAY_WINDOW_MS) return "request_timestamp_stale";
        if (nonces.putIfAbsent(id, current) != null) return "request_replayed";
        if (nonces.size() > MAX_NONCES) { nonces.remove(id); return "replay_window_capacity_exhausted"; }
        return null;
    }

    private static byte[] sha256(String value) { try { return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); } catch (Exception error) { throw new IllegalStateException(error); } }

    private static boolean allowedSource(InetAddress address) {
        if (address.isLoopbackAddress()) return true;
        byte[] raw = address.getAddress();
        if (address instanceof Inet4Address) {
            int first = raw[0] & 0xFF, second = raw[1] & 0xFF;
            return first == 10 || first == 100 && (second & 0xC0) == 0x40 || first == 169 && second == 254 || first == 172 && second >= 16 && second <= 31 || first == 192 && second == 168;
        }
        if (address instanceof Inet6Address) { int first = raw[0] & 0xFF, second = raw[1] & 0xFF; return (first & 0xFE) == 0xFC || first == 0xFE && (second & 0xC0) == 0x80; }
        return false;
    }

    private static Request read(InputStream input) throws IOException {
        String first = line(input, 4096); if (first == null) throw new HttpError(400, "empty_request");
        String[] parts = first.split(" "); if (parts.length != 3 || !parts[2].startsWith("HTTP/1.")) throw new HttpError(400, "invalid_request_line");
        Map<String, String> headers = new HashMap<>();
        for (int count = 0; count < 64; count++) {
            String value = line(input, 8192); if (value == null) throw new HttpError(400, "truncated_headers"); if (value.isEmpty()) break;
            int colon = value.indexOf(':'); if (colon < 1) throw new HttpError(400, "invalid_header"); headers.put(value.substring(0, colon).trim().toLowerCase(Locale.ROOT), value.substring(colon + 1).trim());
            if (count == 63) throw new HttpError(431, "too_many_headers");
        }
        if (headers.containsKey("transfer-encoding")) throw new HttpError(400, "transfer_encoding_not_supported");
        int length = 0;
        if (headers.containsKey("content-length")) { try { length = Integer.parseInt(headers.get("content-length")); } catch (NumberFormatException error) { throw new HttpError(400, "invalid_content_length"); } }
        if (length < 0 || length > MAX_BODY) throw new HttpError(413, "request_too_large");
        byte[] body = new byte[length]; int offset = 0;
        while (offset < length) { int count = input.read(body, offset, length - offset); if (count < 0) throw new HttpError(400, "truncated_body"); offset += count; }
        return new Request(parts[0], parts[1], headers, body);
    }

    private static String line(InputStream input, int maximum) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream(); int previous = -1;
        while (output.size() <= maximum) { int current = input.read(); if (current < 0) return output.size() == 0 ? null : new String(output.toByteArray(), StandardCharsets.UTF_8); if (previous == '\r' && current == '\n') { byte[] raw = output.toByteArray(); return new String(raw, 0, Math.max(0, raw.length - 1), StandardCharsets.UTF_8); } output.write(current); previous = current; }
        throw new HttpError(431, "line_too_long");
    }

    private static JSONObject parseJson(byte[] body) { try { return new JSONObject(new String(body, StandardCharsets.UTF_8)); } catch (Exception error) { throw new HttpError(400, "invalid_json"); } }
    private static String jobId(String path) { String prefix = "/v2/jobs/"; if (!path.startsWith(prefix)) return null; String value = path.substring(prefix.length()); try { return UUID.fromString(value).toString(); } catch (IllegalArgumentException error) { return null; } }
    private static String safe(String value) { if (value == null) return "unknown"; String cleaned = value.replace('\r', ' ').replace('\n', ' ').replace("\0", ""); return cleaned.substring(0, Math.min(160, cleaned.length())); }

    private static void write(Socket socket, int status, JSONObject body) throws IOException {
        byte[] payload = (body.toString() + "\n").getBytes(StandardCharsets.UTF_8);
        String reason = status == 200 ? "OK" : status == 202 ? "Accepted" : status == 400 ? "Bad Request" : status == 401 ? "Unauthorized" : status == 403 ? "Forbidden" : status == 404 ? "Not Found" : status == 409 ? "Conflict" : status == 413 ? "Payload Too Large" : status == 429 ? "Too Many Requests" : status == 431 ? "Request Header Fields Too Large" : status == 503 ? "Service Unavailable" : "Internal Server Error";
        OutputStream output = socket.getOutputStream();
        output.write(("HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: " + payload.length + "\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
        output.write(payload); output.flush();
    }

    private record Request(String method, String path, Map<String, String> headers, byte[] body) {}
    private static final class HttpError extends RuntimeException { final int status; HttpError(int status, String message) { super(message); this.status = status; } }
    private static final class Job {
        final String id, type, createdAt = Instant.now().toString(); final JSONArray provenance = new JSONArray(); volatile String status = "JOB_CREATED", error; volatile JSONObject result;
        Job(String id, String type) throws JSONException { this.id = id; this.type = type; provenance.put(new JSONObject().put("at", createdAt).put("event", status)); }
        synchronized void transition(String state) { status = state; try { provenance.put(new JSONObject().put("at", Instant.now().toString()).put("event", state)); } catch (JSONException error) { throw new IllegalStateException("provenance_encoding_failed", error); } }
        boolean terminal() { return "JOB_COMPLETE".equals(status) || "CANCELLED".equals(status) || "TIMED_OUT".equals(status) || "FAILED".equals(status); }
        JSONObject json() throws JSONException { JSONObject value = new JSONObject().put("jobId", id).put("type", type).put("status", status).put("observedAt", Instant.now().toString()).put("provenance", provenance); if (result != null) value.put("result", result); if (error != null) value.put("error", error); return value; }
    }
}
