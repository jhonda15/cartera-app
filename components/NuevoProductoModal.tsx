'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, X, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  productToEdit?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NuevoProductoModal({
  isOpen,
  productToEdit,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Colonias');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setCategory(productToEdit.category || 'Colonias');
      setPurchasePrice(productToEdit.purchase_price ? productToEdit.purchase_price.toString() : '');
      setSalePrice(productToEdit.sale_price ? productToEdit.sale_price.toString() : '');
      setImagePreview(productToEdit.image_url || null);
    } else {
      setName('');
      setCategory('Colonias');
      setPurchasePrice('');
      setSalePrice('');
      setImagePreview(null);
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const purchaseNum = parseFloat(purchasePrice) || 0;
  const suggestedPriceX2 = purchaseNum * 2;

  // Auto-completar el precio de venta sugerido al escribir el costo si está vacío
  const handlePurchaseChange = (val: string) => {
    setPurchasePrice(val);
    const num = parseFloat(val) || 0;
    if (!salePrice || salePrice === (purchaseNum * 2).toString()) {
      setSalePrice((num * 2).toString());
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (!name.trim() || !purchasePrice) {
      setErrorMsg('El nombre y el costo son obligatorios');
      setLoading(false);
      return;
    }

    try {
      let imageUrl = imagePreview;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-photos')
          .upload(filePath, imageFile);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('product-photos')
            .getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const saleNum = parseFloat(salePrice) || suggestedPriceX2;

      if (productToEdit) {
        const { error } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            category: category,
            purchase_price: purchaseNum,
            sale_price: saleNum,
            image_url: imageUrl,
          })
          .eq('id', productToEdit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([
          {
            name: name.trim(),
            category: category,
            purchase_price: purchaseNum,
            sale_price: saleNum,
            image_url: imageUrl,
          },
        ]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <p className="text-xs text-gray-500">Ajusta costos, precios y fotos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Foto del Producto</label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden relative">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre / Descripción *</label>
            <input
              type="text"
              placeholder="Ej: Combo Colonias (2 unidades)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium text-sm bg-white"
            >
              <option value="Colonias">Colonias / Lociones</option>
              <option value="Sábanas">Sábanas / Lencería</option>
              <option value="Hogar">Hogar / Cortinas / Cobijas</option>
              <option value="Otros">Otros Productos</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Costo Compra *</label>
              <input
                type="number"
                placeholder="Ej: 80000"
                value={purchasePrice}
                onChange={(e) => handlePurchaseChange(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm text-gray-900"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">Sugerido x2: ${suggestedPriceX2.toLocaleString('es-CO')}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">Precio Venta Final *</label>
              <input
                type="number"
                placeholder="Ej: 140000"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-extrabold text-sm text-emerald-800 bg-emerald-50"
              />
              <span className="text-[10px] text-emerald-600 mt-0.5 block">Valor cobrado al cliente</span>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {errorMsg}
            </p>
          )}

          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 border text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition text-sm flex justify-center items-center space-x-1 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : productToEdit ? 'Actualizar' : 'Crear Producto'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}