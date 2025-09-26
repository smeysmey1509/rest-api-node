import { Response } from "express";
import Product from "../../../models/Product";
import Category from "../../../models/Category";
import User from "../../../models/User";
import { Types } from "mongoose";
import { AuthenicationRequest } from "../../../middleware/auth";

function buildSort(sortParam?: string): Record<string, 1 | -1> {
  switch ((sortParam || "").toLowerCase()) {
    case "price_asc":
      return { priceMin: 1, createdAt: -1, _id: -1 };
    case "price_desc":
      return { priceMin: -1, createdAt: -1, _id: -1 };
    case "date_asc":
      return { createdAt: 1, _id: 1 };
    case "date_desc":
      return { createdAt: -1, _id: -1 };
    default:
      return { createdAt: -1, _id: -1 };
  }
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

function resolvePeriod(period?: string): { from?: Date; to?: Date } {
  if (!period) return {};
  const now = new Date();
  const todayStart = startOfDay(now),
    todayEnd = endOfDay(now);
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = endOfDay(
    new Date(now.getFullYear(), now.getMonth(), 0)
  );

  switch (period) {
    case "today":
      return { from: todayStart, to: todayEnd };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last7d": {
      const f = new Date(now);
      f.setDate(now.getDate() - 6);
      return { from: startOfDay(f), to: todayEnd };
    }
    case "last30d": {
      const f = new Date(now);
      f.setDate(now.getDate() - 29);
      return { from: startOfDay(f), to: todayEnd };
    }
    case "this_month":
      return { from: startOfDay(firstOfThisMonth), to: todayEnd };
    case "prev_month":
      return {
        from: startOfDay(firstOfPrevMonth),
        to: endOfDay(endOfPrevMonth),
      };
    default:
      return {};
  }
}

// helpers for category parsing
const toArrayParam = (v: unknown): string[] =>
  v == null
    ? []
    : (Array.isArray(v) ? v : String(v).split(","))
        .map((s) => s.trim())
        .filter(Boolean);

export const listProducts = async (
  req: AuthenicationRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const user = userId ? await User.findById(userId).lean() : null;

    const defaultLimit = user?.limit ?? 25;
    const limit = Math.max(
      parseInt(String(req.query.limit ?? "")) || defaultLimit,
      1
    );
    const page = Math.max(parseInt(String(req.query.page ?? "")) || 1, 1);
    const skip = (page - 1) * limit;

    const sort = buildSort(String(req.query.sort ?? ""));

    // Date published filter
    const hasPublishedAt = !!Product.schema.path("publishedAt");
    const dateField: "publishedAt" | "createdAt" = hasPublishedAt
      ? "publishedAt"
      : "createdAt";

    const { publishedOn, publishedFrom, publishedTo, period } =
      req.query as Record<string, string | undefined>;
    const range: Record<"$gte" | "$lte", Date> = {} as any;

    if (publishedOn) {
      const d = new Date(publishedOn);
      if (!isNaN(d.getTime())) {
        range.$gte = startOfDay(d);
        range.$lte = endOfDay(d);
      }
    } else {
      if (publishedFrom) {
        const f = new Date(publishedFrom);
        if (!isNaN(f.getTime())) range.$gte = startOfDay(f);
      }
      if (publishedTo) {
        const t = new Date(publishedTo);
        if (!isNaN(t.getTime())) range.$lte = endOfDay(t);
      }
      const p = resolvePeriod(period);
      if (p.from) range.$gte = p.from;
      if (p.to) range.$lte = p.to;
    }

    const query: any = { isDeleted: { $ne: true } };
    if (range.$gte || range.$lte) query[dateField] = range;

    const categoryParams = [
      ...toArrayParam(req.query.category),
      ...toArrayParam(req.query.categories),
    ];

    if (categoryParams.length) {
      const objectIds: Types.ObjectId[] = [];
      const keys: string[] = [];

      for (const token of categoryParams) {
        if (Types.ObjectId.isValid(token))
          objectIds.push(new Types.ObjectId(token));
        else keys.push(token);
      }

      if (keys.length) {
        const cats = await Category.find(
          {
            $or: [
              { categoryId: { $in: keys } },
              { categoryName: { $in: keys } },
            ],
          },
          { _id: 1 }
        ).lean();
        objectIds.push(...cats.map((c) => c._id as Types.ObjectId));
      }

      query.category = {
        $in: objectIds.length
          ? objectIds
          : [new Types.ObjectId("000000000000000000000000")],
      };
    }

    const products = await Product.find(query)
      .select("-dedupeKey")
      .populate("category", "categoryId categoryName productCount")
      .populate("seller", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true });

    res.status(200).json(products);
  } catch (err) {
    console.error("listProducts error:", err);
    res.status(500).json({ error: "Failed to fetch products." });
  }
};
