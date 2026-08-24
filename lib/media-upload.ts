import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

import { apiPost } from "@/lib/api-client";

export type PickedMedia = {
  uri: string;
  type: "image" | "video";
  mimeType?: string | null;
  fileName?: string | null;
};

function fallbackMimeType(media: PickedMedia) {
  return media.type === "video" ? "video/mp4" : "image/jpeg";
}

function fallbackFileName(media: PickedMedia, mimeType: string) {
  const extension = mimeType.split("/")[1]?.replace("quicktime", "mov") || (media.type === "video" ? "mp4" : "jpg");
  return media.fileName || `hadx-${Date.now()}.${extension}`;
}

export async function uploadPickedMedia(media: PickedMedia) {
  const mimeType = media.mimeType || fallbackMimeType(media);
  const fileName = fallbackFileName(media, mimeType);
  const signedResponse = await apiPost("/media/upload-url", {
    fileName,
    contentType: mimeType,
  });

  const { signedUrl, publicUrl, path } = signedResponse.data as {
    signedUrl: string;
    publicUrl: string;
    path: string;
  };

  if (!signedUrl || !publicUrl || !path) {
    throw new Error("Media storage returned an incomplete upload response.");
  }

  const base64 = await FileSystem.readAsStringAsync(media.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const uploadResponse = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "content-type": mimeType,
      "cache-control": "3600",
    },
    body: decode(base64),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Media upload failed (${uploadResponse.status}).`);
  }

  return { publicUrl, path, mimeType, type: media.type };
}
