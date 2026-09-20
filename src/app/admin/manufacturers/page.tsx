"use client";

import AuthGuard from "@/components/AuthGuard";
import ManufacturerAdmin from "@/components/admin/ManufacturerAdmin";

/** 제조사 관리 — 등록·수정·삭제. */
export default function AdminManufacturersPage() {
  return (
    <AuthGuard requireAdmin>
      <ManufacturerAdmin />
    </AuthGuard>
  );
}
