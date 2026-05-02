"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, ToggleLeft, ToggleRight, AlertCircle, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface Product {
  id: string; title: string; sku: string; price: string;
  wholesale_price: string | null; stock: number; available_stock: number;
  status: string; is_approved: boolean; is_featured: boolean;
  brand: string | null; images: { url: string; is_primary?: boolean }[] | null;
  created_at: string;
}

function StatusBadge({ approved, status }: { approved: boolean; status: string }) {
  if (!approved && status === "draft")
    return <span className="badge bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1"><Clock className="w-3 h-3" />Pending Approval</span>;
  if (approved && status === "active")
    return <span className="badge bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Live</span>;
  if (status === "archived")
    return <span className="badge bg-gray-100 text-gray-600 border-gray-200">Archived</span>;
  return <span className="badge bg-gray-100 text-gray-500 border-gray-200">{status}</span>;
}

export default function VendorProductsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", sku: "", description: "", wholesale_price: "", price: "",
    stock: "0", brand: "", images: "",
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["vendor-products"],
    queryFn: () => api.get("/vendor/products").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/vendor/products", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
      toast.success("Product submitted for approval");
      resetForm();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Failed to create product");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/vendor/products/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-products"] }),
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Update failed");
    },
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const resetForm = () => {
    setForm({ title: "", sku: "", description: "", wholesale_price: "", price: "", stock: "0", brand: "", images: "" });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const imageList = form.images
      ? [{ url: form.images, alt: form.title, is_primary: true }]
      : [];
    createMutation.mutate({
      title: form.title, sku: form.sku, description: form.description,
      wholesale_price: parseFloat(form.wholesale_price),
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      brand: form.brand || null,
      images: imageList,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">New products require admin approval before going live</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-md btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Add product form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Product</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Product Title *</label>
              <input className="input" value={form.title} onChange={set("title")} required />
            </div>
            <div>
              <label className="label">SKU *</label>
              <input className="input" value={form.sku} onChange={set("sku")} required />
            </div>
            <div>
              <label className="label">Brand</label>
              <input className="input" value={form.brand} onChange={set("brand")} />
            </div>
            <div>
              <label className="label">Wholesale Price (your price) *</label>
              <input className="input" type="number" min="0.01" step="0.01" value={form.wholesale_price} onChange={set("wholesale_price")} required />
            </div>
            <div>
              <label className="label">Retail Price (selling price) *</label>
              <input className="input" type="number" min="0.01" step="0.01" value={form.price} onChange={set("price")} required />
            </div>
            <div>
              <label className="label">Initial Stock</label>
              <input className="input" type="number" min="0" value={form.stock} onChange={set("stock")} />
            </div>
            <div>
              <label className="label">Image URL</label>
              <input className="input" type="url" value={form.images} onChange={set("images")} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} value={form.description} onChange={set("description")} />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="btn btn-md btn-primary">
                {createMutation.isPending ? "Submitting…" : "Submit for Approval"}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-md btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Products table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No products yet</p>
          <p className="text-gray-400 text-sm mt-1">Click &ldquo;Add Product&rdquo; to get started</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Product</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">SKU</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Wholesale</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Retail</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Stock</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.title} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{p.title}</p>
                        {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-4 text-right font-medium text-gray-700">
                    ${parseFloat(p.wholesale_price ?? "0").toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-gray-900">
                    ${parseFloat(p.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={p.available_stock <= 5 ? "text-red-600 font-semibold" : "text-gray-700"}>
                      {p.available_stock}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <StatusBadge approved={p.is_approved} status={p.status} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    {p.is_approved && (
                      <button
                        onClick={() =>
                          toggleMutation.mutate({ id: p.id, status: p.status === "active" ? "archived" : "active" })
                        }
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        title={p.status === "active" ? "Disable" : "Enable"}
                      >
                        {p.status === "active"
                          ? <ToggleRight className="w-5 h-5 text-brand-600" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Margin note */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-sm">
        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-blue-700">
          <strong>Margin = Retail Price − Wholesale Price.</strong> The platform keeps the difference. Your payout is based on the wholesale price you set.
        </p>
      </div>
    </div>
  );
}
