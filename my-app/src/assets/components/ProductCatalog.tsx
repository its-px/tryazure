import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Checkbox } from "@mui/material";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { supabase } from "./supabaseClient";
import type { Product } from "./productsService";
import PhotoUploadField from "./PhotoUploadField";

interface ProductCatalogProps {
  tenantId: string;
}

const emptyForm = { name: "", price: "", replenish_days: "", active: true };

// Tenant owner CRUD for retail add-on products. Mirrors the Dialog-based
// edit pattern already used for bookings in OwnerPanel.tsx — no new UI
// pattern introduced.
export default function ProductCatalog({ tenantId }: ProductCatalogProps) {
  const colors = useResolvedColors();
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    setProducts((data as Product[]) ?? []);
  };

  useEffect(() => {
    if (tenantId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: String(p.price),
      replenish_days: p.replenish_days != null ? String(p.replenish_days) : "",
      active: p.active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const payload = {
      tenant_id: tenantId,
      name: form.name,
      price: Number(form.price) || 0,
      replenish_days: form.replenish_days ? Number(form.replenish_days) : null,
      active: form.active,
    };
    if (editingId) {
      await supabase.from("products").update(payload).eq("id", editingId);
    } else {
      // Insert first so the photo (if any is added next) has a stable
      // {productId}.webp storage path to upload against.
      const { data } = await supabase.from("products").insert(payload).select("id").single();
      if (data?.id) setEditingId(data.id);
    }
    await load();
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const toggleActive = async (p: Product) => {
    await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    await load();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.75 }}>
        <Box sx={{ fontSize: 16, fontWeight: 700 }}>Product Catalog</Box>
        <Button variant="contained" size="small" onClick={openNew} sx={{ backgroundColor: colors.accent.main }}>
          Add Product
        </Button>
      </Box>

      <Box sx={{ background: colors.background.medium, borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}>
        {products.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center", color: colors.text.tertiary, fontSize: 13 }}>
            No products yet
          </Box>
        )}
        {products.map((p) => (
          <Box
            key={p.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 80px 80px",
              px: 2, py: 1.5,
              alignItems: "center",
              fontSize: 13,
              borderTop: `1px solid ${colors.border.main}`,
            }}
          >
            <span>{p.name}</span>
            <span>€{p.price}</span>
            <span>{p.replenish_days ? `${p.replenish_days}d replenish` : "—"}</span>
            <span>{p.active ? "Active" : "Inactive"}</span>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" onClick={() => openEdit(p)}>Edit</Button>
              <Button size="small" onClick={() => toggleActive(p)}>
                {p.active ? "Deactivate" : "Activate"}
              </Button>
            </Box>
          </Box>
        ))}
      </Box>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {editingId && (
            <PhotoUploadField
              storagePath={`${tenantId}/products/${editingId}.webp`}
              currentUrl={products.find((p) => p.id === editingId)?.photo_url}
              onUploaded={async (url) => {
                await supabase.from("products").update({ photo_url: url }).eq("id", editingId);
                await load();
              }}
            />
          )}
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
          />
          <TextField
            label="Price"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            fullWidth
          />
          <TextField
            label="Replenish after (days)"
            type="number"
            helperText="Typical days until a customer needs to rebuy. Leave blank for no replenishment SMS."
            value={form.replenish_days}
            onChange={(e) => setForm({ ...form, replenish_days: e.target.value })}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{editingId ? "Close" : "Cancel"}</Button>
          <Button variant="contained" onClick={save} disabled={!form.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
