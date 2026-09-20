"use client";

import AuthGuard from "@/components/AuthGuard";
import IngredientAdmin from "@/components/admin/IngredientAdmin";

/** 원료 관리 — 등록·수정·삭제. */
export default function AdminIngredientsPage() {
  return (
    <AuthGuard requireAdmin>
      <IngredientAdmin />
    </AuthGuard>
  );
}
