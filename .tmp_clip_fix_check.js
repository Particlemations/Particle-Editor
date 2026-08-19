const fs = require('fs');
const vm = require('vm');
const files = [
  'engine/lib/uuid.js',
  'engine/src/Wick.js',
  'engine/src/Clipboard.js',
  'engine/src/Color.js',
  'engine/src/FileCache.js',
  'engine/src/History.js',
  'engine/src/ObjectCache.js',
  'engine/src/Transformation.js',
  'engine/src/ToolSettings.js',
  'engine/src/GlobalAPI.js',
  'engine/src/builtinassets/BuiltinAssets.js',
  'engine/src/export/ExportUtils.js',
  'engine/src/export/audio/AudioTrack.js',
  'engine/src/export/autosave/AutoSave.js',
  'engine/src/export/wick/WickFile.js',
  'engine/src/export/wick/WickFile.Alpha.js',
  'engine/src/export/wickobj/WickObjectFile.js',
  'engine/src/export/html/HTMLExport.js',
  'engine/src/export/html/HTMLPreview.js',
  'engine/src/export/svg/SvgFile.js',
  'engine/src/export/image/ImageSequence.js',
  'engine/src/export/zip/ZIPExport.js',
  'engine/src/base/Base.js',
  'engine/src/base/Layer.js',
  'engine/src/base/Project.js',
  'engine/src/base/Selection.js',
  'engine/src/base/Timeline.js',
  'engine/src/base/Tween.js',
  'engine/src/base/Path.js',
  'engine/src/base/asset/Asset.js',
  'engine/src/base/asset/FileAsset.js',
  'engine/src/base/asset/FontAsset.js',
  'engine/src/base/asset/ImageAsset.js',
  'engine/src/base/asset/ClipAsset.js',
  'engine/src/base/asset/GIFAsset.js',
  'engine/src/base/asset/SoundAsset.js',
  'engine/src/base/asset/SVGAsset.js',
  'engine/src/base/Tickable.js',
  'engine/src/base/Frame.js',
  'engine/src/base/Clip.js',
  'engine/src/base/Button.js',
  'engine/src/tools/Tool.js',
  'engine/src/tools/Brush.js',
  'engine/src/tools/Cursor.js',
  'engine/src/tools/Ellipse.js',
  'engine/src/tools/Eraser.js',
  'engine/src/tools/Eyedropper.js',
  'engine/src/tools/FillBucket.js',
  'engine/src/tools/GradientTool.js',
  'engine/src/tools/Interact.js',
  'engine/src/tools/Line.js',
  'engine/src/tools/None.js',
  'engine/src/tools/Pan.js',
  'engine/src/tools/PathCursor.js',
  'engine/src/tools/Pencil.js',
  'engine/src/tools/Rectangle.js',
  'engine/src/tools/Text.js',
  'engine/src/tools/Zoom.js',
  'engine/src/view/paper-ext/Layer.erase.js',
  'engine/src/view/paper-ext/Paper.hole.js',
  'engine/src/view/paper-ext/Paper.OrderingUtils.js',
  'engine/src/view/paper-ext/Paper.SelectionWidget.js',
  'engine/src/view/paper-ext/Paper.SelectionBox.js',
  'engine/src/view/paper-ext/Path.potrace.js',
  'engine/src/view/paper-ext/TextItem.edit.js',
  'engine/src/view/paper-ext/View.pressure.js',
  'engine/src/view/paper-ext/View.gestures.js',
  'engine/src/view/paper-ext/View.scrollToZoom.js',
  'engine/src/view/View.js',
  'engine/src/view/View.Project.js',
  'engine/src/view/View.Selection.js',
  'engine/src/view/View.Clip.js',
  'engine/src/view/View.Button.js',
  'engine/src/view/View.Timeline.js',
  'engine/src/view/View.Layer.js',
  'engine/src/view/View.Frame.js',
  'engine/src/view/View.Path.js',
  'engine/src/gui/GUIElement.js',
  'engine/src/gui/Button.js',
  'engine/src/gui/Ghost.js',
  'engine/src/gui/Icons.js',
  'engine/src/gui/ActionButton.js',
  'engine/src/gui/ActionButtonsContainer.js',
  'engine/src/gui/Breadcrumbs.js',
  'engine/src/gui/BreadcrumbsButton.js',
  'engine/src/gui/Frame.js',
  'engine/src/gui/FrameEdgeGhost.js',
  'engine/src/gui/FrameGhost.js',
  'engine/src/gui/FramesContainer.js',
  'engine/src/gui/Layer.js',
  'engine/src/gui/LayerButton.js',
  'engine/src/gui/LayerCreateLabel.js',
  'engine/src/gui/LayersContainer.js',
  'engine/src/gui/NumberLine.js',
  'engine/src/gui/OnionSkinRange.js',
  'engine/src/gui/Playhead.js',
  'engine/src/gui/PopupMenu.js',
  'engine/src/gui/Project.js',
  'engine/src/gui/Scrollbar.js',
  'engine/src/gui/ScrollbarGrabber.js',
  'engine/src/gui/SelectionBox.js',
  'engine/src/gui/Timeline.js',
  'engine/src/gui/Tooltip.js',
  'engine/src/gui/Tween.js',
  'engine/src/gui/TweenGhost.js'
];

const code = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const sandbox = {
  console,
  window: {},
  document: { createElement() { return {}; }, body: { appendChild() {} } },
  navigator: { userAgent: 'node' },
  setTimeout,
  clearTimeout,
};

sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.console = console;
sandbox.window.navigator = sandbox.navigator;
sandbox.window.requestAnimationFrame = (cb) => cb();
sandbox.window.cancelAnimationFrame = () => {};

vm.runInNewContext(code, sandbox, { filename: 'wickengine-source.js' });
const Wick = sandbox.window.Wick;
const project = new Wick.Project();
const clip = new Wick.Clip();
project.activeFrame.addClip(clip);
project.selection.select(clip);
project.selection.clipType = 'graphic';
console.log('A', clip.clipType, project.selection.clipType);
if (clip.clipType !== 'graphic' || project.selection.clipType !== 'graphic') {
  throw new Error('Graphic clip type not preserved after first set');
}
project.selection.clear();
project.selection.select(clip);
console.log('B', clip.clipType, project.selection.clipType);
if (clip.clipType !== 'graphic' || project.selection.clipType !== 'graphic') {
  throw new Error('Graphic clip type not preserved after reselect');
}
project.selection.clipType = 'movieClip';
console.log('C', clip.clipType, project.selection.clipType);
if (clip.clipType !== 'movieClip' || project.selection.clipType !== 'movieClip') {
  throw new Error('Movie clip type not preserved after switch');
}
console.log('Verification OK');
