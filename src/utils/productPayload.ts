// Construit le FormData/JSON envoyé lors de la création ou modification d’un produit.
export type ProductFormFields = Record<string, string | number | boolean>;
export type ProductMutationPayload = FormData | Record<string, string | number | boolean | null>;

// Transforme ou formate les données via buildProductMutationPayload.
export function buildProductMutationPayload(
  fields: ProductFormFields,
  imageFile: File | null,
  removeExistingImage: boolean,
): ProductMutationPayload {
  if (imageFile) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    });
    formData.append('image', imageFile);
    return formData;
  }
  return removeExistingImage ? { ...fields, image_url: null } : fields;
}
