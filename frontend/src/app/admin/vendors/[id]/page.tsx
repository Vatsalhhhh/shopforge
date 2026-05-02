"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface VendorDetail {
  id: string; business_name: string; business_email: string;
  business_phone: string | null; description: string | null;
  status: string; commission_rate: string; total_orders: number;
  total_revenue: string; rating: number | null;
  business_address: Record<string, string> | null;
  warehouse_address: Record<string, string> | null;
  approved_at: string | null; rejected_reason: string | null;
  admin_notes: string | null; created_at: string;
}

interface VendorProduct {
  id: string; title: string; sku: string; price: string;
  wholesale_price: string | null; stock: number; is_approved: boolean; status: string;
}

export default function AdminVendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: vendor, isLoading } = useQuery<VendorDetail>({
    queryKey: ["admin-vendor", id],
    queryFn: () => api.get(`/admin/vendors/${id}`).then((r) => r.data),
  });

  const { data: products = [] } = useQuery<VendorProduct[]>({
    queryKey: ["admin-vendor-products", id],
    queryFn: () => api.get(`/admin/vendors/${id}/products`).then((r) => r.data),
  });

  const approveProdMutation = useMutation({
    mutationFn: (pid: string) => api.post(`/admin/vendors/products/${pid}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-vendor-products", id] }); toast.success("Product approved and live"); },
    onError: () => toast.error("Failed"),
  });

  const rejectProdMutation = useMutation({
    mutationFn: (pid: string) => api.post(`/admin/vendors/products/${pid}/reject`, { reason: "Does not meet quality standards" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-vendor-products", id] }); toast.success("Product rejected"); },
    onError: () => toast.error("Failed"),
  });

  if (isLoading) {
    return <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />;
  }
  if (!vendor) return <p className="text-gray-500">Vendor not found</p>;

  const margin = vendor.commission_rate
    ? `${((1 - parseFloat(vendor.commission_rate)) * 100).toFixed(0)}%`
    : "N/A";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/vendors" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">{vendor.business_name}</h1>
          <p className="text-gray-500 text-sm">{vendor.business_email}</p>
        </div>
        <span className={`ml-auto badge capitalize ${
          vendor.status === "approved" ? "bg-green-100 text-green-700" :
          vendor.status === "pending" ? "bg-amber-100 text-amber-700" :
          "bg-red-100 text-red-700"}`}
        >
          {vendor.status}
        </span>
      </div>

      {/* Vendor details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Business Info</h3>
          <Row label="Phone" value={vendor.business_phone} />
          <Row label="Platform Margin" value={margin} />
          <Row label="Total Orders" value={vendor.total_orders} />
          <Row label="Total Revenue" value={`$${parseFloat(vendor.total_revenue).toFixed(2)}`} />
          <Row label="Rating" value={vendor.rating ? `${vendor.rating} / 5` : "No ratings yet"} />
          <Row label="Applied" value={new Date(vendor.created_at).toLocaleDateString()} />
          {vendor.approved_at && <Row label="Approved" value={new Date(vendor.approved_at).toLocaleDateString()} />}
          {vendor.rejected_reason && <Row label="Rejection Reason" value={vendor.rejected_reason} />}
        </div>

        {vendor.description && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{vendor.description}</p>
          </div>
        )}
      </div>

      {/* Product approvals */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4" /> Products
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-1">
              {products.filter((p) => !p.is_approved).length} pending approval
            </span>
          </h3>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No products submitted yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-2.5 text-gray-500 font-medium">Product</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Wholesale</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Retail</th>
                <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Stock</th>
                <th className="text-center px-4 py-2.5 text-gray-500 font-medium">Approval</th>
                <th className="text-center px-4 py-2.5 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{p.title}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    ${parseFloat(p.wholesale_price ?? "0").toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ${parseFloat(p.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.stock}</td>
                  <td className="px-4 py-3 text-center">
                    {p.is_approved
                      ? <span className="badge bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 inline mr-1" />Approved</span>
                      : <span className="badge bg-amber-100 text-amber-700">Pending</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!p.is_approved && (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => approveProdMutation.mutate(p.id)}
                          disabled={approveProdMutation.isPending}
                          className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rejectProdMutation.mutate(p.id)}
                          disabled={rejectProdMutation.isPending}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-900 font-medium">{value ?? "—"}</span>
    </div>
  );
}
