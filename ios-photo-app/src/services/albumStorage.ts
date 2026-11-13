import type { UserAlbum, PhotoItem } from "../types";

const ALBUM_STORAGE_KEY = "cloud_photos_user_albums";

export function getUserAlbums(): UserAlbum[] {
  try {
    const raw = localStorage.getItem(ALBUM_STORAGE_KEY);
    if (raw) {
      const albums: UserAlbum[] = JSON.parse(raw);
      // Tự động dọn dẹp các đường link blob: cũ đã hết hạn giữa các session
      let changed = false;
      albums.forEach((a) => {
        if (a.coverPhotoUrl && a.coverPhotoUrl.startsWith("blob:")) {
          delete a.coverPhotoUrl;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(albums));
      }
      return albums;
    }
  } catch (e) {
    console.warn("Lỗi đọc danh sách album:", e);
  }
  return [];
}

export function saveUserAlbums(albums: UserAlbum[]): void {
  try {
    // Không bao giờ lưu blob: URL tạm thời vào persistent storage
    const cleanAlbums = albums.map((a) => {
      if (a.coverPhotoUrl && a.coverPhotoUrl.startsWith("blob:")) {
        const copy = { ...a };
        delete copy.coverPhotoUrl;
        return copy;
      }
      return a;
    });
    localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(cleanAlbums));
  } catch (e) {
    console.warn("Lỗi lưu album:", e);
  }
}

export function createNewAlbum(title: string): UserAlbum {
  const newAlbum: UserAlbum = {
    id: `album_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    createdAt: Date.now(),
    photoIds: [],
  };
  const albums = getUserAlbums();
  albums.unshift(newAlbum);
  saveUserAlbums(albums);
  return newAlbum;
}

export function addPhotosToAlbum(
  albumId: string,
  photoIds: (string | number)[],
  _coverUrl?: string
): UserAlbum[] {
  const albums = getUserAlbums();
  const target = albums.find((a) => a.id === albumId);
  if (target) {
    const existing = new Set(target.photoIds.map(String));
    photoIds.forEach((pid) => existing.add(String(pid)));
    target.photoIds = Array.from(existing);
    // Tự động lưu ID ảnh đầu tiên làm coverPhotoId
    if (!target.coverPhotoId && photoIds.length > 0) {
      target.coverPhotoId = photoIds[0];
    }
    saveUserAlbums(albums);
  }
  return albums;
}

export function removePhotoFromAlbum(albumId: string, photoId: string | number): UserAlbum[] {
  const albums = getUserAlbums();
  const target = albums.find((a) => a.id === albumId);
  if (target) {
    const idStr = String(photoId);
    target.photoIds = target.photoIds.filter((id) => String(id) !== idStr);
    if (String(target.coverPhotoId) === idStr) {
      target.coverPhotoId = target.photoIds[0];
    }
    saveUserAlbums(albums);
  }
  return albums;
}

export function deleteAlbum(albumId: string): UserAlbum[] {
  const albums = getUserAlbums().filter((a) => a.id !== albumId);
  saveUserAlbums(albums);
  return albums;
}

export function getPhotosInAlbum(album: UserAlbum, allPhotos: PhotoItem[]): PhotoItem[] {
  const idSet = new Set(album.photoIds.map(String));
  return allPhotos.filter((p) => idSet.has(String(p.id)) || idSet.has(String(p.messageId)));
}

/**
 * Tự động tìm ảnh đại diện hợp lệ làm hình nền cho Album:
 * Luôn lấy ảnh đầu tiên trong album có URL hợp lệ của phiên làm việc hiện tại
 */
export function getAlbumCoverUrl(album: UserAlbum, allPhotos: PhotoItem[]): string | null {
  const albumPhotos = getPhotosInAlbum(album, allPhotos);
  if (albumPhotos.length > 0) {
    const targetItem = album.coverPhotoId
      ? albumPhotos.find(
          (p) =>
            String(p.messageId) === String(album.coverPhotoId) ||
            String(p.id) === String(album.coverPhotoId)
        ) || albumPhotos[0]
      : albumPhotos[0];
    return targetItem.thumbnailUrl || targetItem.url;
  }
  if (album.coverPhotoUrl && !album.coverPhotoUrl.startsWith("blob:")) {
    return album.coverPhotoUrl;
  }
  return null;
}
