package org.agentcontrol.android.adapter;

import android.nfc.Tag;
import android.nfc.tech.IsoDep;
import android.nfc.tech.MifareClassic;
import android.nfc.tech.MifareUltralight;
import android.nfc.tech.NfcA;
import android.nfc.tech.NfcB;
import android.nfc.tech.NfcBarcode;
import android.nfc.tech.NfcF;
import android.nfc.tech.NfcV;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;
import java.util.Arrays;

final class NfcMetadata {
    static final String SCHEMA = "agent-control.nfc-inspection/v1";
    private NfcMetadata() {}

    static JSONObject inspect(Tag tag) throws JSONException {
        byte[] identifier = tag.getId();
        String[] technologies = tag.getTechList();
        Arrays.sort(technologies);
        JSONObject metadata = new JSONObject();
        metadata.put("identifier", new JSONObject()
                .put("rawBytes", HexCodec.raw(identifier))
                .put("hex", HexCodec.hex(identifier))
                .put("hexReversed", HexCodec.reversedHex(identifier)));
        metadata.put("technologies", new JSONArray(Arrays.asList(technologies)));

        JSONArray families = new JSONArray();
        NfcA nfcA = NfcA.get(tag);
        if (nfcA != null) {
            families.put("ISO_14443_A");
            int sak = nfcA.getSak() & 0xFFFF;
            metadata.put("nfcA", new JSONObject().put("atqa", HexCodec.bytes(nfcA.getAtqa())).put("sak", sak).put("sakHex", String.format(java.util.Locale.ROOT, sak > 0xFF ? "%04X" : "%02X", sak)));
        }
        NfcB nfcB = NfcB.get(tag);
        if (nfcB != null) {
            families.put("ISO_14443_B");
            metadata.put("nfcB", new JSONObject().put("applicationData", HexCodec.bytes(nfcB.getApplicationData())).put("protocolInfo", HexCodec.bytes(nfcB.getProtocolInfo())));
        }
        IsoDep isoDep = IsoDep.get(tag);
        if (isoDep != null) {
            families.put("ISO_14443_4");
            JSONObject value = new JSONObject();
            if (isoDep.getHistoricalBytes() != null) value.put("historicalBytes", HexCodec.bytes(isoDep.getHistoricalBytes()));
            if (isoDep.getHiLayerResponse() != null) value.put("hiLayerResponse", HexCodec.bytes(isoDep.getHiLayerResponse()));
            metadata.put("isoDep", value);
        }
        NfcF nfcF = NfcF.get(tag);
        if (nfcF != null) {
            families.put("NFC_F_JIS_6319_4");
            metadata.put("nfcF", new JSONObject().put("manufacturer", HexCodec.bytes(nfcF.getManufacturer())).put("systemCode", HexCodec.bytes(nfcF.getSystemCode())));
        }
        NfcV nfcV = NfcV.get(tag);
        if (nfcV != null) {
            families.put("ISO_15693");
            metadata.put("nfcV", new JSONObject().put("dsfId", nfcV.getDsfId() & 0xFF).put("responseFlags", nfcV.getResponseFlags() & 0xFF));
        }
        MifareClassic classic = MifareClassic.get(tag);
        if (classic != null) metadata.put("mifareClassic", new JSONObject().put("type", classic.getType()).put("sizeBytes", classic.getSize()).put("sectorCount", classic.getSectorCount()).put("blockCount", classic.getBlockCount()));
        MifareUltralight ultralight = MifareUltralight.get(tag);
        if (ultralight != null) metadata.put("mifareUltralight", new JSONObject().put("type", ultralight.getType()));
        NfcBarcode barcode = NfcBarcode.get(tag);
        if (barcode != null) metadata.put("nfcBarcode", new JSONObject().put("type", barcode.getType()));
        metadata.put("families", families);

        return new JSONObject().put("schema", SCHEMA).put("policy", "read-only").put("observedAt", Instant.now().toString()).put("tag", metadata);
    }
}
