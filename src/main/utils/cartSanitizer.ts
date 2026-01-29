type AnyRecord = Record<string, any>;

const stripFormattedField = (value: any) => {
  if (!value || typeof value !== "object") return value;
  const { formatted: _formatted, ...rest } = value as AnyRecord;
  return rest;
};

export const sanitizeCartItems = (items: any[]) => {
  if (!Array.isArray(items)) return items;

  return items.map((item) => {
    const itemObj =
      typeof item?.toObject === "function" ? item.toObject() : item;
    if (!itemObj || typeof itemObj !== "object") return itemObj;

    const { formatted: _formatted, product, ...itemRest } = itemObj as AnyRecord;
    const productObj =
      typeof product?.toObject === "function" ? product.toObject() : product;
    const sanitizedProduct = stripFormattedField(productObj);

    return {
      ...itemRest,
      product: sanitizedProduct,
    };
  });
};
