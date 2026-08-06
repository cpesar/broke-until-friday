import { Router } from "express";
import { eq, and, or, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { categories } from "../db/schema.js";
import { requireSession } from "../middleware/requireSession.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireSession);

categoriesRouter.get("/", async (req, res) => {
  const userId = req.session!.user.id;

  const rows = await db
    .select()
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)));

  res.json({ categories: rows });
});

categoriesRouter.post("/", async (req, res) => {
  const userId = req.session!.user.id;
  const { name, icon, color, parentCategoryId } = req.body as {
    name?: string;
    icon?: string;
    color?: string;
    parentCategoryId?: string;
  };

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [category] = await db
    .insert(categories)
    .values({
      userId,
      name,
      icon: icon ?? null,
      color: color ?? null,
      parentCategoryId: parentCategoryId ?? null,
      isDefault: false,
    })
    .returning();

  res.status(201).json({ category });
});

categoriesRouter.patch("/:id", async (req, res) => {
  const userId = req.session!.user.id;
  const { id } = req.params;
  const { name, icon, color } = req.body as {
    name?: string;
    icon?: string;
    color?: string;
  };

  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id));

  if (!existing || existing.isDefault || existing.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [category] = await db
    .update(categories)
    .set({
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
    })
    .where(eq(categories.id, id))
    .returning();

  res.json({ category });
});

categoriesRouter.delete("/:id", async (req, res) => {
  const userId = req.session!.user.id;
  const { id } = req.params;

  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id));

  if (!existing || existing.isDefault || existing.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(categories).where(eq(categories.id, id));

  res.json({ success: true });
});
