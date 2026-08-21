# IoT Problem Solution Web

เว็บไซต์เริ่มต้นสำหรับระบบ IoT Problem Solution ที่เชื่อมกับ Supabase

## สิ่งที่มีให้แล้ว

- Login ด้วย Supabase Auth (Email/Password)
- ตรวจ role จาก `public.profiles`
- Admin Dashboard
- แสดง Solution ที่มี `status = published`
- Admin เพิ่ม Solution
- รองรับ RLS ที่สร้างไว้ใน Supabase

## 1. ติดตั้ง

ต้องมี Node.js ก่อน จากนั้นเปิด Terminal ในโฟลเดอร์นี้:

```bash
npm install
```

## 2. ตั้งค่า Supabase

สร้างไฟล์ชื่อ `.env` โดยคัดลอกจาก `.env.example`

ใส่:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

ค่าเหล่านี้ดูได้จาก Supabase Project Settings / API

## 3. รัน

```bash
npm run dev
```

จากนั้นเปิด URL ที่ Vite แสดง เช่น:

```text
http://localhost:5173
```

## หมายเหตุ

โค้ดชุดแรกนี้ตั้งใจทำเป็นฐานสำหรับต่อยอด:
- จัดการ Problems
- อัปโหลด problem-images
- เพิ่ม/แก้/ลบ Solutions
- อัปโหลด solution-images
- ระบบ pending / published
- หน้า User ส่ง Solution
- หน้า Admin ตรวจและอนุมัติ
