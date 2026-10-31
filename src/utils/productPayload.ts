export type ProductFormFields = Record<string, string | number>;
export type ProductMutationPayload = FormData | Record<string, string | number | null>;

/** Construit le payload d’un produit : multipart si image remplacée, null explicite si image retirée. */
export function buildProductMutationPayload(
  fields: ProductFormFields,
  imageFile: File | null,
  removeExistingImage: boolean,
): ProductMutationPayload {
  if (imageFile) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append('image', imageFile);
    return formData;
  }
  return removeExistingImage ? { ...fields, image_url: null } : fields;
}
