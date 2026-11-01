import { http } from "@/lib/http-client";
import { resizeImage } from "@/lib/resize-image";
import { Button, Card, CloseButton, Image, Modal, SimpleGrid, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

const MAX_BATCH = 10;
const TYPES = ["image/jpeg", "image/png"];

// Separate photo upload form: drop/pick up to 10 images, give each a caption, upload them.
// The limit is per upload; a UMKM can hold any number of photos.
export default function FotoUploader({ umkmId, opened, onClose, onUploaded }) {
  const [items, setItems] = useState([]); // {key, file, preview, caption}
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  // free the object URLs on unmount
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  const addFiles = (fileList) => {
    const files = [...fileList];
    const valid = files.filter((f) => TYPES.includes(f.type));
    if (valid.length < files.length)
      notifications.show({ color: "red", message: "Hanya file JPEG/PNG yang diterima" });

    const free = MAX_BATCH - items.length;
    if (valid.length > free)
      notifications.show({ color: "red", message: `Maksimal ${MAX_BATCH} foto per upload` });

    setItems((cur) => [
      ...cur,
      ...valid.slice(0, free).map((file) => ({
        key: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        caption: "",
      })),
    ]);
  };

  const remove = (item) => {
    URL.revokeObjectURL(item.preview);
    setItems((cur) => cur.filter((i) => i.key !== item.key));
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Foto"
      size="xl"
      closeOnClickOutside={!uploading}
      closeOnEscape={!uploading}
      withCloseButton={!uploading}
    >
      <div
        role="button"
        tabIndex={0}
        data-testid="dropzone"
        className={`cursor-pointer rounded-md border-2 border-dashed p-6 text-center ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <Text size="sm">KLIK ATAU DRAG GAMBAR KEDALAM BOX</Text>
        <IconPlus size={32} className="mx-auto" />
        <Text size="xs" c="dimmed">
          Maks. {MAX_BATCH} foto per upload, JPEG/PNG, maks. 250 KB per foto (foto besar dikecilkan
          otomatis)
        </Text>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept="image/jpeg,image/png"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ""; // allow picking the same file again
          }}
        />
      </div>

      {items.length > 0 && (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} mt="md">
          {items.map((item) => (
            <Card key={item.key} withBorder padding="xs" radius="md">
              <div className="relative">
                <Image src={item.preview} alt={item.file.name} radius="sm" h={140} fit="cover" />
                <CloseButton
                  className="absolute right-1 top-1"
                  variant="filled"
                  size="sm"
                  aria-label="Buang foto"
                  disabled={uploading}
                  onClick={() => remove(item)}
                />
              </div>
              <Textarea
                mt="xs"
                label="Caption"
                placeholder="Tampak depan"
                maxLength={500}
                autosize
                minRows={1}
                maxRows={3}
                disabled={uploading}
                value={item.caption}
                onChange={(e) => {
                  const caption = e.currentTarget.value;
                  setItems((cur) => cur.map((i) => (i.key === item.key ? { ...i, caption } : i)));
                }}
              />
            </Card>
          ))}
        </SimpleGrid>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleUpload} loading={uploading} disabled={items.length === 0}>
          Upload
        </Button>
      </div>
    </Modal>
  );

  // one request per photo, so a failure only keeps the failed ones in the form
  async function handleUpload() {
    setUploading(true);
    const failed = [];

    for (const item of items) {
      try {
        const blob = await resizeImage(item.file);
        const payload = new FormData();
        payload.append("file", blob, "foto.jpg");
        payload.append("caption", item.caption);
        // the instance default is application/json, which would turn FormData into JSON
        await http.post(`/umkm/${umkmId}/foto`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
          silent: true,
        });
      } catch (err) {
        console.error("error upload foto: ", err);
        failed.push(item);
      }
    }

    setUploading(false);
    const done = items.length - failed.length;
    items.filter((i) => !failed.includes(i)).forEach((i) => URL.revokeObjectURL(i.preview));
    setItems(failed);
    if (done > 0) onUploaded();

    if (failed.length === 0) {
      notifications.show({ color: "green", message: `${done} foto berhasil diupload` });
      onClose();
    } else {
      notifications.show({ color: "red", message: `${failed.length} foto gagal diupload, coba lagi` });
    }
  }
}
