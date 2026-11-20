// A blog post's cover photo, from the admin form: made web-ready straight
// away (one photo is quick), into PHOTO_DIR/<post id>/, replacing or
// removing the old one's files.
import type { Post } from "./blog.ts";
import { processPhoto, photoStore } from "./photos.ts";
import { deletePhotoFiles, deleteCarFiles, MAX_UPLOAD_BYTES } from "./photo-queue.ts";

/** The post's cover after the form: kept, replaced or removed. */
export async function applyCover(form: FormData, post: Post): Promise<{ post: Post; error?: string }> {
  const file = form.get("cover");
  const upload = file instanceof File && file.size > 0 ? file : null;
  const remove = form.get("removeCover") === "on";

  if (upload) {
    if (!upload.type.startsWith("image/")) return { post, error: "That isn't a photo" };
    if (upload.size > MAX_UPLOAD_BYTES) return { post, error: "Choose a photo under 30 MB" };
    try {
      const cover = await processPhoto(Buffer.from(await upload.arrayBuffer()), photoStore(), post.id, `cover${Date.now().toString(36)}`);
      if (post.cover) await deletePhotoFiles(post.id, post.cover);
      return { post: { ...post, cover } };
    } catch {
      return { post, error: "That photo couldn't be read. Try a JPG." };
    }
  }
  if (remove && post.cover) {
    await deletePhotoFiles(post.id, post.cover);
    return { post: { ...post, cover: undefined } };
  }
  return { post };
}

/** Deletes all of a post's photo files (the same layout as a car's). */
export const deletePostFiles = (id: string) => deleteCarFiles(id);
