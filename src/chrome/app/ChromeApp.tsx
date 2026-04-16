import { useRef, useEffect, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { ChromeLayout } from '../features/chrome-layout/ChromeLayout';
import { ViewerAdapterProvider } from '../features/viewer-adapter/ViewerAdapterContext';
import { createModelViewerAdapter } from '../features/viewer-adapter/modelViewerAdapter';
import { mockViewerAdapter } from '../features/viewer-adapter/mockViewerAdapter';
import type { ViewerAdapter, ObjectStreamingState } from '../features/viewer-adapter/types';
// This is the sole engine import — isolated to this entry file.
// @ts-expect-error -- ModelViewer is vanilla JS with no type declarations
import { ModelViewer } from '../../index.js';

const DEFAULT_MODEL_URL = '/models/Condos.ifc';

function setInitialLoadingCamera(viewer: InstanceType<typeof ModelViewer>) {
  // Keep a stable wide framing before any geometry appears.
  viewer.navigation.setCamera(
    { x: 55, y: 40, z: 55 },
    { x: 0, y: 0, z: 0 },
  );
}

function WelcomeOverlay({
  onLoadUrl,
  onLoadFile,
  onBack,
}: {
  onLoadUrl: (url: string) => void;
  onLoadFile: (file: File) => void;
  onBack?: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith('.ifc')) {
        onLoadFile(file);
      }
    },
    [onLoadFile],
  );

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/95">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      )}
      <div className="text-center max-w-md px-10">
        <svg
          className="mx-auto mb-6 text-blue-500"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>

        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          3D IFC Model Viewer
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Load and explore IFC building models in 3D. Navigate with orbit
          controls, select elements, control visibility, and more.
        </p>

        <div
          className={`border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-blue-600">
              Drop IFC file here
            </span>{' '}
            or click to browse
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
            Or try a sample model
          </p>
          <button
            type="button"
            onClick={() => onLoadUrl('/models/Condos.ifc')}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
          >
            Condos Building
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ifc"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLoadFile(file);
          }}
        />
      </div>
    </div>
  );
}

export function ChromeApp() {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<InstanceType<typeof ModelViewer> | null>(null);
  const [adapter, setAdapter] = useState<ViewerAdapter>(mockViewerAdapter);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadRequested, setLoadRequested] = useState(false);
  const [showUploadPage, setShowUploadPage] = useState(false);
  const [streamingState, setStreamingState] = useState<ObjectStreamingState>({
    streamingSupported: false,
    parserProgress: 0,
    totalObjects: 0,
    streamComplete: false,
    hasError: false,
  });

  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    // Guard against React StrictMode double-mount
    if (viewerInstanceRef.current) return;

    const viewer = new ModelViewer(container, {
      showToolbar: false,
      showStatusBar: false,
      showGrid: true,
      showLoadingOverlay: false,
      autoZoomOnLoad: false,
      autoZoomOnObjectLoadStart: false,
    });
    viewerInstanceRef.current = viewer;

    viewer.on('ready', () => {
      console.log('[ChromeApp] viewer ready — switching to real adapter');

      const scene = viewer.sceneManager.getScene();
      if (scene?.background?.setHex) {
        scene.background.setHex(0xf3f4f6);
      }
      const renderer = viewer.sceneManager.getRenderer();
      if (renderer?.shadowMap) {
        renderer.shadowMap.enabled = false;
      }

      const realAdapter = createModelViewerAdapter(viewer);
      flushSync(() => {
        setAdapter(realAdapter);
      });
      (window as unknown as Record<string, unknown>).__viewerAdapterReady = true;

      // Auto-load the default sample model
      setLoadRequested(true);
      setModelLoaded(true);
      setInitialLoadingCamera(viewer);
      const name = DEFAULT_MODEL_URL.split('/').pop();
      viewer.loadModel(DEFAULT_MODEL_URL, name).catch((err: unknown) => {
        console.error('Failed to auto-load default model:', err);
        setModelLoaded(false);
      });
    });

    viewer.on('error', (data: unknown) => {
      console.error('[ChromeApp] viewer error:', data);
    });

    viewer.on('load-complete', () => {
      setModelLoaded(true);
    });

    (window as unknown as Record<string, unknown>).viewer = viewer;
  }, []);

  const handleLoadUrl = useCallback(async (url: string) => {
    const viewer = viewerInstanceRef.current;
    if (!viewer) return;
    setLoadRequested(true);
    setModelLoaded(true); // Hide overlay immediately
    setInitialLoadingCamera(viewer);
    try {
      const name = url.split('/').pop();
      await viewer.loadModel(url, name);
    } catch (err) {
      console.error('Failed to load model:', err);
      setModelLoaded(false); // Show overlay again on error
    }
  }, []);

  const handleLoadFile = useCallback(async (file: File) => {
    const viewer = viewerInstanceRef.current;
    if (!viewer) return;
    setLoadRequested(true);
    setModelLoaded(true);
    setInitialLoadingCamera(viewer);
    try {
      await viewer.loadModelFromFile(file, file.name);
    } catch (err) {
      console.error('Failed to load model:', err);
      setModelLoaded(false);
    }
  }, []);

  useEffect(() => {
    if (!adapter.subscribeObjectStreamingState || !adapter.getObjectStreamingState) {
      return;
    }

    setStreamingState(adapter.getObjectStreamingState());
    const unsubscribe = adapter.subscribeObjectStreamingState((nextState) => {
      setStreamingState(nextState);
    });

    return unsubscribe;
  }, [adapter]);

  const showStreamingIndicator =
    loadRequested &&
    !streamingState.streamComplete &&
    !streamingState.hasError &&
    (streamingState.streamingSupported || streamingState.parserProgress > 0);
  const parserProgressPercent = Math.max(0, Math.min(100, Math.round(streamingState.parserProgress * 100)));
  const parsedObjects =
    streamingState.totalObjects > 0
      ? Math.round(streamingState.parserProgress * streamingState.totalObjects)
      : 0;
  const objectsProgressLabel =
    streamingState.totalObjects > 0
      ? `${parsedObjects} / ${streamingState.totalObjects} objects`
      : `${parserProgressPercent}% parsed`;

  return (
    <ViewerAdapterProvider adapter={adapter}>
      <ChromeLayout
        viewerContainerRef={viewerContainerRef}
        showOverlays={loadRequested && !showUploadPage}
        onUploadClick={() => setShowUploadPage(true)}
        streamingProgress={showStreamingIndicator ? parserProgressPercent : null}
      />
      {showUploadPage && (
        <WelcomeOverlay
          onLoadUrl={(url) => {
            handleLoadUrl(url);
            setShowUploadPage(false);
          }}
          onLoadFile={(file) => {
            handleLoadFile(file);
            setShowUploadPage(false);
          }}
          onBack={() => setShowUploadPage(false)}
        />
      )}
    </ViewerAdapterProvider>
  );
}
