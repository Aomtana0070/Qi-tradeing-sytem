IQ Option Bot - Suggested Features

สรุปฟีเจอร์ที่เพิ่ม/แนะนำ (สั้น เข้าใจง่าย)

1. Risk & Protection

- Economic Calendar filter: หยุดเทรดช่วงข่าวสำคัญ (High impact) และลดขนาดตอน Medium impact
- Session filter (Bangkok time): เทรดเฉพาะช่วง London/New York
- Volatility filter (ATR): บล็อกถ้าตลาดเงียบ/ผันผวนเกินไป
- Circuit Breaker: 4 ระดับ (ลดขนาด, หยุดชั่วคราว, หยุดวัน)
- Capital Preserver: บังคับหยุดหรือจำกัดขนาดเมื่อทุนลดลงสูง

2. Intelligence / Signal Quality

- Trend confirmation (EMA): เทรดตามเทรนด์เท่านั้น
- Pattern recognition: ยืนยันด้วยรูปแท่งเทียน (engulfing, hammer, star)
- Support/Resistance boost: เพิ่มคะแนนเมื่อสัญญาณใกล้ S/R
- Market regime (ADX): ปรับน้ำหนักกลยุทธ์ตามตลาด (trend vs range)
- Confidence scorer: รวมคะแนนจากทุกตัวเพื่อกำหนดขนาดการเทรด

3. Dashboard / UX

- ปรับแต่งค่าระบบจากแดชบอร์ดได้ (max trade %, consecutive losses, start balance)
- แสดงสถานะตัวกรองและตัวชี้วัดสด (RSI, MACD, ATR, EMA)
- ปุ่ม PAUSE / RESUME / EMERGENCY STOP
- Price chart, recent trades, last signal และสรุปผลแบบเข้าใจง่าย

4. Analytics & Adaptive

- Rolling win-rate rules: หยุดอัตโนมัติเมื่อ performance ต่ำ
- Performance analytics: profit factor, expectancy, hourly stats
- Time-of-day analyzer: เรียนรู้ชั่วโมงที่ทำกำไรเพื่อปรับการเทรด

การใช้งานสั้นๆ

- เปลี่ยนค่าเริ่มต้นได้ใน `src/config.js` หรือหน้าแดชบอร์ด
- ฟีเจอร์การป้องกันทั้งหมดจะทำงานก่อนส่งคำสั่งจริง

ถ้าต้องการ ผมจะช่วยต่อด้วย:

- เพิ่มปุ่ม PAUSE/RESUME ในแดชบอร์ด
- เพิ่มรายงานสรุปรายสัปดาห์ (Telegram)
- จำลองแท่งเพื่อให้กราฟขึ้นทันทีเพื่อทดสอบ UI

บอกผมได้ว่าจะให้ทำข้อไหนต่อครับ (ตัวเลือกยอดนิยม: "เพิ่ม PAUSE/RESUME" หรือ "จำลองแท่งให้กราฟขึ้น")
