package org.agentcontrol.android.adapter;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class HexCodecTest {
    @Test public void preservesRawByteOrderAndProvidesReverseRepresentation() {
        byte[] value = new byte[] {(byte) 0x04, (byte) 0xA2, 0x00, (byte) 0xFF};
        assertEquals("04A200FF", HexCodec.hex(value));
        assertEquals("FF00A204", HexCodec.reversedHex(value));
    }
}
