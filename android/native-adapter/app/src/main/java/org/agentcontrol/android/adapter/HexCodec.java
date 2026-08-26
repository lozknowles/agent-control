package org.agentcontrol.android.adapter;

import org.json.JSONArray;
import org.json.JSONException;

final class HexCodec {
    private HexCodec() {}

    static String hex(byte[] value) {
        StringBuilder output = new StringBuilder(value.length * 2);
        for (byte item : value) output.append(String.format(java.util.Locale.ROOT, "%02X", item & 0xFF));
        return output.toString();
    }

    static String reversedHex(byte[] value) {
        StringBuilder output = new StringBuilder(value.length * 2);
        for (int index = value.length - 1; index >= 0; index--) output.append(String.format(java.util.Locale.ROOT, "%02X", value[index] & 0xFF));
        return output.toString();
    }

    static JSONArray raw(byte[] value) {
        JSONArray output = new JSONArray();
        for (byte item : value) output.put(item & 0xFF);
        return output;
    }

    static org.json.JSONObject bytes(byte[] value) throws JSONException {
        return new org.json.JSONObject().put("rawBytes", raw(value)).put("hex", hex(value));
    }
}
