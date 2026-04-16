import { Header } from '../header/Header';
import { LeftToolbar } from '../left-toolbar/LeftToolbar';
import { RightToolbar } from '../right-toolbar/RightToolbar';
import { ViewCube } from '../view-cube/ViewCube';
import { MiniMap } from '../minimap/MiniMap';
import { NavigationWheel } from '../navigation-wheel/NavigationWheel';
import { ViewerCanvas } from '../viewer-canvas/ViewerCanvas';

export function ChromeLayout() {
  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      <Header />

      <div className="relative flex-1 overflow-hidden">
        <ViewerCanvas />

        {/* Floating overlays */}
        <LeftToolbar />
        <RightToolbar />
        <ViewCube />
        <MiniMap />
        <NavigationWheel />
      </div>
    </div>
  );
}
