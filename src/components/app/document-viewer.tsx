"use client";

import { useMemo, useState } from "react";
import { FileTextIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DocumentViewer() {
  const [url, setUrl] = useState<string | null>(null);

  const objectUrl = useMemo(() => url, [url]);

  return (
    <div className="rounded-lg border border-border/70 bg-card/55 p-5">
      <div className="flex items-center gap-2">
        <FileTextIcon className="size-5 text-emerald-400" />
        <h2 className="font-heading text-lg font-medium">RFP / PDF viewer</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a PDF tender locally to inspect it while completing company settings and proposal evidence.
      </p>
      <div className="mt-4 space-y-2">
        <Label htmlFor="pdf-viewer-file">PDF document</Label>
        <Input
          id="pdf-viewer-file"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (url) URL.revokeObjectURL(url);
            setUrl(URL.createObjectURL(file));
          }}
        />
      </div>
      <div className="mt-4 h-[560px] overflow-hidden rounded-lg border border-border/70 bg-background/50">
        {objectUrl ? (
          <iframe src={objectUrl} title="PDF viewer" className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Upload a PDF to preview tender pages here.
          </div>
        )}
      </div>
    </div>
  );
}
