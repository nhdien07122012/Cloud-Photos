import type { UserAlbum, PhotoItem } from "../types";

const ALBUM_STORAGE_KEY = "cloud_photos_user_albums";

export function getUserAlbums(): UserAlbum[] {
  try {
    const raw = localStorage.getItem(ALBUM_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Lỗi đọc danh sách album:", e);
  }
  return [];
}

export function saveUserAlbums(albums: UserAlbum[]): void {
  try {
    localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(albums));
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

export function addPhotosToAlbum(albumId: string, photoIds: (string | number)[], coverUrl?: string): UserAlbum[] {
  const albums = getUserAlbums();
  const target = albums.find((a) => a.id === albumId);
  if (target) {
    const existing = new Set(target.photoIds.map(String));
    photoIds.forEach((pid) => existing.add(String(pid)));
    target.photoIds = Array.from(existing);
    if (coverUrl && !target.coverPhotoUrl) {
      target.coverPhotoUrl = coverUrl;
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
