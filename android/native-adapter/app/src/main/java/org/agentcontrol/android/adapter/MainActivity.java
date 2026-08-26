package org.agentcontrol.android.adapter;

import android.app.Activity;
import android.graphics.Typeface;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;
import org.json.JSONException;

import java.io.IOException;
import java.util.UUID;

public final class MainActivity extends Activity implements AdapterServer.Delegate, NfcAdapter.ReaderCallback {
    private AdapterServer server;
    private NfcAdapter nfc;
    private EditText tokenInput;
    private EditText portInput;
    private TextView status;
    private boolean resumed;
    private boolean readerEnabled;
    private String waitingJobId;
    private String instanceId;
    private String nodeId;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        instanceId = getPreferences(MODE_PRIVATE).getString("instanceId", null);
        if (instanceId == null) { instanceId = UUID.randomUUID().toString(); getPreferences(MODE_PRIVATE).edit().putString("instanceId", instanceId).apply(); }
        nodeId = "android-" + instanceId.replace("-", "").substring(0, 16);
        nfc = NfcAdapter.getDefaultAdapter(this);
        setContentView(interfaceView());
        show("Disabled. Node identity " + nodeId + ". NFC " + (nfc == null ? "not present" : nfc.isEnabled() ? "available" : "present but disabled in Android settings") + ".");
    }

    private View interfaceView() {
        int padding = Math.round(20 * getResources().getDisplayMetrics().density);
        LinearLayout content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(padding, padding, padding, padding);
        TextView title = new TextView(this); title.setText("Agent Control Android Adapter"); title.setTextSize(24); title.setTypeface(Typeface.DEFAULT_BOLD); content.addView(title);
        TextView boundary = new TextView(this); boundary.setText("Typed Android jobs only. NFC inspection is one-shot and read-only. This app exposes no shell, APDU, authentication, write, cloning or emulation command."); boundary.setTextSize(16); boundary.setPadding(0, padding / 2, 0, padding); content.addView(boundary);
        tokenInput = new EditText(this); tokenInput.setHint("Session token (24+ characters; kept in memory only)"); tokenInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD); content.addView(tokenInput);
        portInput = new EditText(this); portInput.setHint("Endpoint port"); portInput.setText("8788"); portInput.setInputType(InputType.TYPE_CLASS_NUMBER); content.addView(portInput);
        Button enable = new Button(this); enable.setText("Enable typed node"); enable.setOnClickListener(view -> enable()); content.addView(enable);
        Button disable = new Button(this); disable.setText("Disable / human takeover"); disable.setOnClickListener(view -> disable("on-device human takeover")); content.addView(disable);
        status = new TextView(this); status.setTextSize(16); status.setTextIsSelectable(true); status.setPadding(0, padding, 0, 0); content.addView(status);
        ScrollView scroll = new ScrollView(this); scroll.addView(content); return scroll;
    }

    private void enable() {
        if (server != null) { show("Already enabled."); return; }
        String token = tokenInput.getText().toString(); if (token.length() < 24) { show("Token must contain at least 24 characters."); return; }
        int port; try { port = Integer.parseInt(portInput.getText().toString()); } catch (NumberFormatException error) { show("Port must be a number."); return; }
        if (port < 1024 || port > 65535) { show("Port must be between 1024 and 65535."); return; }
        try { server = new AdapterServer(nodeId, instanceId, token, port, this); server.start(); tokenInput.setText(""); }
        catch (IOException error) { server = null; show("Could not start endpoint: " + error.getClass().getSimpleName()); }
    }

    private void disable(String reason) {
        disableReader(); waitingJobId = null;
        if (server != null) { AdapterServer current = server; server = null; current.stop(reason); }
        tokenInput.setText(""); show("Disabled by human. No jobs can be accepted.");
    }

    @Override protected void onResume() { super.onResume(); resumed = true; }
    @Override protected void onPause() { resumed = false; disableReader(); if (server != null) server.activityUnavailable(); super.onPause(); }
    @Override protected void onDestroy() { disable("activity destroyed"); super.onDestroy(); }

    @Override public boolean isNfcReady() { return resumed && nfc != null && nfc.isEnabled(); }
        @Override public JSONObject diagnostic() throws JSONException { return new JSONObject().put("androidVersion", android.os.Build.VERSION.RELEASE).put("sdk", android.os.Build.VERSION.SDK_INT).put("manufacturer", android.os.Build.MANUFACTURER).put("model", android.os.Build.MODEL).put("nfcPresent", nfc != null).put("nfcEnabled", nfc != null && nfc.isEnabled()).put("activityForeground", resumed); }

    @Override public void onWaitingForCard(String jobId) {
        runOnUiThread(() -> {
            if (server == null || !isNfcReady()) { if (server != null) server.activityUnavailable(); return; }
            waitingJobId = jobId;
            int flags = NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_NFC_B | NfcAdapter.FLAG_READER_NFC_F | NfcAdapter.FLAG_READER_NFC_V | NfcAdapter.FLAG_READER_NFC_BARCODE | NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS;
            nfc.enableReaderMode(this, this, flags, null); readerEnabled = true;
            show("WAITING_FOR_CARD\nPresent exactly one authorised card. Move away or press Disable to cancel.");
        });
    }

    @Override public void onTagDiscovered(Tag tag) {
        AdapterServer current = server; if (current == null || waitingJobId == null) return;
        JSONObject metadata;
        try { metadata = NfcMetadata.inspect(tag); } catch (Exception error) { current.failNfc("safe_metadata_read_failed"); return; }
        current.completeNfc(metadata); waitingJobId = null; runOnUiThread(() -> { disableReader(); show("SAFE_METADATA_READ\nResult returned to Agent Control. Reader mode is no longer armed."); });
    }

    @Override public void onNfcJobStopped(String jobId, String reason) { runOnUiThread(() -> { if (jobId.equals(waitingJobId)) waitingJobId = null; disableReader(); show("NFC job stopped: " + reason); }); }
    @Override public void onServerStatus(String value) { runOnUiThread(() -> show(value)); }

    private void disableReader() { if (readerEnabled && nfc != null) { try { nfc.disableReaderMode(this); } catch (Exception ignored) {} } readerEnabled = false; }
    private void show(String value) { if (status != null) status.setText(value); }
}
