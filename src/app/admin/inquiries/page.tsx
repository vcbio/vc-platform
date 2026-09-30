"use client";

import AuthGuard from "@/components/AuthGuard";
import InquiryAdmin from "@/components/admin/InquiryAdmin";

export default function AdminInquiriesPage() {
  return <AuthGuard requireAdmin><InquiryAdmin /></AuthGuard>;
}
