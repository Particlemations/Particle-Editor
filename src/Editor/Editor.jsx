/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published
 * by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from 'react';

import './_editor.scss';
import './styles/default_theme.css';
import './styles/default_styles.css';

import 'bootstrap/dist/css/bootstrap.min.css';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import 'react-reflex/styles.css';
import { ReflexContainer, ReflexSplitter, ReflexElement } from 'react-reflex';
import { throttle } from 'underscore';
import localForage from 'localforage';
import 'react-toastify/dist/ReactToastify.css';
import { toast } from 'react-toastify';
import { SizeMe } from 'react-sizeme';

import HotKeyInterface from './hotKeyMap';
import ActionMapInterface from './actionMap';
import ScriptInfoInterface from './scriptInfo';
import FontInfoInterface from './fontInfo';
import EditorCore from './EditorCore';

import DockedPanel from './Panels/DockedPanel/DockedPanel';
import Canvas from './Panels/Canvas/Canvas';
import Inspector from './Panels/Inspector/Inspector';
import MenuBar from './Panels/MenuBar/MenuBar';
import Timeline from './Panels/Timeline/Timeline';
import MobileContainer from './Panels/MobileContainer/MobileContainer';
import DeleteCopyPaste from './Panels/DeleteCopyPaste/DeleteCopyPaste';
import CanvasTransforms from './Panels/CanvasTransforms/CanvasTransforms';
import Toolbox from './Panels/Toolbox/Toolbox';
import AssetLibrary from './Panels/AssetLibrary/AssetLibrary';
import Outliner from './Panels/Outliner/Outliner';
import OutlinerExpandButton from './Panels/OutlinerExpandButton/OutlinerExpandButton';
import WickCodeEditor from './PopOuts/WickCodeEditor/WickCodeEditor';

import EditorWrapper from './EditorWrapper';

const { version } = require('../../package.json');

var classNames = require('classnames');

class Editor extends EditorCore {
  constructor() {
    super();

    window.Wick.resourcepath = 'corelibs/wick-engine/';

    this.project = null;
    this.paper = null;
    this.editorVersion = version + '';

    this.state = {
      project: null,
      previewPlaying: false,
      activeModalName: window.localStorage.skipWelcomeMessage
        ? null
        : 'WelcomeMessage',
      activeModalQueue: [],
      codeEditorOpen: false,
      scriptToEdit: 'default',
      showCanvasActions: false,
      showBrushModes: false,
      showCursorTransformModes: false,
      showGradientToolModes: false,
      showCodeErrors: false,
      codeError: null,
      popoutOutlinerSize: 250,
      outlinerPoppedOut: false,
      inspectorSize: 250,
      timelineSize: 175,
      assetLibrarySize: 150,
      consoleLogs: [],
      warningModalInfo: {
        description: 'No Description Given',
        title: 'Title',
        acceptText: 'Accept',
        cancelText: 'Cancel',
        acceptAction: () => {
          console.warn('No Accept Action');
        },
        cancelAction: () => {
          console.warn('No Cancel Action');
        },
      },
      renderProgress: 0,
      renderType: 'default',
      renderStatusMessage: '',
      customHotKeys: {},
      colorPickerType: 'swatches',
      lastColorsUsed: [
        '#FFFFFF',
        '#FFFFFF',
        '#FFFFFF',
        '#FFFFFF',
        '#FFFFFF',
        '#FFFFFF',
        '#FFFFFF',
        '#FFFFFF',
      ],
      exporting: false,
      useCustomOnionSkinningColors: false,
      customOnionSkinningColors: {
        backward: 'rgba(0, 255, 0, .3)',
        forward: 'rgba(255, 0, 0, .3)',
      },
      onionSkinningWasOn: false,
      localSavedFiles: [],
    };

    window.onerror = function(error, url, line) {
      console.error(error);
      console.log('Error Details:', {
        error,
        url,
        line,
      });
      return true;
    };

    this.error = null;
    this._lastAutosave = 0;

    this.fontInfoInterface = new FontInfoInterface(this);
    this.hotKeyInterface = new HotKeyInterface(this);
    this.actionMapInterface = new ActionMapInterface(this);
    this.scriptInfoInterface = new ScriptInfoInterface();

    if (window.wickEditorFileSystemType === 'local') {
      window.openWickLocalFileViewer = (files) => {
        console.log('Files Received', files);
        this.setState({
          localSavedFiles: files,
          activeModalName: 'SavedProjects',
        });
      };

      window.warnBeforeSave = (args) => {
        this.openWarningModal(args);
      };
    }

    this.openProjectFileFromClient = window.createFileInput({
      accept: '.zip, .wick',
      onChange: this.handleWickFileLoad,
    });

    this.openAssetFileFromClient = window.createFileInput({
      accept: window.Wick.FileAsset.getValidExtensions().join(', '),
      onChange: this.handleAssetFileImport,
      multiple: true,
    });

    this.maxLastColors = 8;
    this._onEyedropperPickedColor = (color) => {};

    this.RESIZE_THROTTLE_AMOUNT_MS = 100;
    this.WINDOW_RESIZE_THROTTLE_AMOUNT_MS = 300;

    this.resizeProps = {
      onStopResize: throttle(
        this.onStopResize,
        this.resizeThrottleAmount
      ),
      onStopPopoutOutlinerResize: throttle(
        this.onStopPopoutOutlinerResize,
        this.resizeThrottleAmount
      ),
      onStopInspectorResize: throttle(
        this.onStopInspectorResize,
        this.resizeThrottleAmount
      ),
      onStopAssetLibraryResize: throttle(
        this.onStopAssetLibraryResize,
        this.resizeThrottleAmount
      ),
      onStopTimelineResize: throttle(
        this.onStopTimelineResize,
        this.resizeThrottleAmount
      ),
      onStopCodeEditorResize: throttle(
        this.onStopCodeEditorResize,
        this.resizeThrottleAmount
      ),
      onResize: throttle(
        this.onResize,
        this.resizeThrottleAmount
      ),
      onWindowResize: throttle(
        this.onWindowResize,
        this.windowResizeThrottleAmount
      ),
    };

    window.addEventListener(
      'resize',
      this.resizeProps.onWindowResize
    );

    this.canvasComponent = null;
    this.timelineComponent = null;

    this.lastUsedTool = 'cursor';

    this.builtinPreviews = {};
  }

  UNSAFE_componentWillMount = () => {
    document.title = `Wick Editor ${this.editorVersion}`;

    this.project = new window.Wick.Project();

    this.attachErrorHandlers();

    this.paper = window.paper;

    localForage.config({
      name: 'WickEditor',
      description: 'Live Data storage of the Wick Editor app.',
    });

    this.customHotKeysKey = 'wickEditorcustomHotKeys';
    this.colorPickerTypeKey = 'wickEditorColorPickerType';

    localForage.getItem(this.customHotKeysKey).then(
      (customHotKeys) => {
        if (!customHotKeys) customHotKeys = {};

        this.hotKeyInterface.setCustomHotKeys(customHotKeys);

        this.setState({
          customHotKeys: customHotKeys,
        });
      }
    );

    localForage.getItem(this.colorPickerTypeKey).then(
      (colorPickerType) => {
        if (!colorPickerType) colorPickerType = 'swatches';

        this.setState({
          colorPickerType: colorPickerType,
        });
      }
    );

    this.setState({
      ...this.state,
      project: this.project.serialize(),
      codeEditorWindowProperties:
        this.getDefaultCodeEditorProperties(),
    });

    window.onbeforeunload = function(event) {
      if (this.project.numUndoStates > 1) {
        return null;
      }

      var confirmationMessage =
        'Warning: All unsaved changes will be lost!';

      (event || window.event).returnValue = confirmationMessage;

      return confirmationMessage;
    };
  };

  componentDidMount = () => {
    console.log('Project Mounted');

    this.hidePreloader();
    this.onWindowResize();

    if (!this.tryToParseProjectURL()) {
      this.showAutosavedProjects();
    }

    this.watchForHover();
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (
      this.state.previewPlaying &&
      !prevState.previewPlaying
    ) {
      this.project.view.canvas.focus();

      this.project.play({
        onError: (error) => {
          if (error) {
            console.error(
              new Error(
                `${error.message} on line ${error.lineNumber} in script "${error.name}".`
              )
            );

            this.setState({
              codeError: error,
            });
          }

          this.stopPreviewPlaying(error);
        },

        onAfterTick: () => {
          this.project.guiElement.draw();
        },

        onBeforeTick: () => {},
      });
    }

    if (
      !this.state.previewPlaying &&
      prevState.previewPlaying
    ) {
      this.project.stop();

      this.projectDidChange({
        skipHistory: true,
        actionName: 'Stop Project',
      });
    }
  };

  watchForHover = () => {
    let lastTouchTime = 0;

    function enableHover() {
      if (new Date() - lastTouchTime < 500) return;

      document.body.classList.add('hasHover');
    }

    function disableHover() {
      document.body.classList.remove('hasHover');
    }

    function updateLastTouchTime() {
      lastTouchTime = new Date();
    }

    document.addEventListener(
      'touchstart',
      updateLastTouchTime,
      true
    );

    document.addEventListener(
      'touchstart',
      disableHover,
      true
    );

    document.addEventListener(
      'mousemove',
      enableHover,
      true
    );

    enableHover();
  };

  hidePreloader = () => {
    let preloader =
      window.document.getElementById('preloader');

    setTimeout(() => {
      if (!preloader) return;

      preloader.style.opacity = '0';

      this.recenterCanvas();

      setTimeout(() => {
        if (preloader) {
          preloader.style.display = 'none';

          if (preloader.remove) {
            preloader.remove();
          }
        }
      }, 500);

      this.project.view.render();
    }, 2000);
  };

  showWaitOverlay = (message) => {
    window.clearTimeout(
      this._showWaitOverlayTimeoutID
    );

    this._showWaitOverlayTimeoutID =
      window.setTimeout(() => {
        let waitOverlay =
          window.document.getElementById(
            'wait-overlay'
          );

        if (!waitOverlay) return;

        waitOverlay.innerHTML =
          message || 'Please wait...';

        waitOverlay.style.display = 'block';
      }, 250);
  };

  hideWaitOverlay = () => {
    window.clearTimeout(
      this._showWaitOverlayTimeoutID
    );

    let waitOverlay =
      window.document.getElementById('wait-overlay');

    if (waitOverlay) {
      waitOverlay.style.display = 'none';
    }
  };

  resetEditorForLoad = () => {};

  changeColorPickerType = (type) => {
    localForage.setItem(
      this.colorPickerTypeKey,
      type
    );

    this.setState({
      colorPickerType: type,
    });
  };

  onWindowResize = () => {
    this.resizeProps.onResize();

    this.setState({
      codeEditorWindowProperties:
        this.getDefaultCodeEditorProperties(),
    });

    this.project.view.render();
    this.recenterCanvas();
  };

  getDefaultCodeEditorProperties = () => {
    var width = window.innerWidth / 2;
    var height = window.innerHeight / 2;

    return {
      width: width,
      height: height,
      x: window.innerWidth / 2 - width / 2,
      y: window.innerHeight / 2 - height / 2,
      minWidth: 400,
      minHeight: 250,
      consoleHeight: 100,
      consoleOpen: true,
      fontSize: 16,
      theme: 'monokai',
    };
  };

  updateLastColors = (color) => {
    let newArray =
      this.state.lastColorsUsed.concat([]);

    let index = newArray.indexOf(color);

    if (index > -1) {
      newArray.splice(index, 1);
    } else {
      newArray.pop();
    }

    newArray.unshift(color);

    this.setState({
      lastColorsUsed: newArray,
    });
  };

  toggleOutliner = () => {
    this.setState({
      outlinerPoppedOut:
        !this.state.outlinerPoppedOut,
    });
  };

  onResize = (e) => {
    this.project.view.resize();
    this.project.guiElement.draw();
  };

  onStopResize = ({ domElement, component }) => {};

  getSizeHorizontal = (domElement) => {
    return domElement.offsetWidth;
  };

  getSizeVertical = (domElement) => {
    return domElement.offsetHeight;
  };

  updateCodeEditorWindowProperties = (
    newProperties
  ) => {
    let finalProperties =
      this.state.codeEditorWindowProperties;

    Object.keys(newProperties).forEach((key) => {
      finalProperties[key] =
        newProperties[key];
    });

    this.setState({
      codeEditorWindowProperties:
        finalProperties,
    });
  };

  onScriptUpdate = () => {
    if (this.project.error) {
      this.clearCodeEditorError();
    }
  };

  onStopPopoutOutlinerResize = ({
    domElement,
    component,
  }) => {
    if (!domElement) return;

    this.setState({
      popoutOutlinerSize:
        this.getSizeHorizontal(domElement),
    });
  };

  onStopInspectorResize = ({
    domElement,
    component,
  }) => {
    if (!domElement) return;

    this.setState({
      inspectorSize:
        this.getSizeHorizontal(domElement),
    });
  };

  onStopAssetLibraryResize = ({
    domElement,
    component,
  }) => {
    if (!domElement) return;

    this.setState({
      assetLibrarySize:
        this.getSizeHorizontal(domElement),
    });
  };

  onStopTimelineResize = ({
    domElement,
    component,
  }) => {
    if (!domElement) return;

    var size =
      this.getSizeVertical(domElement);

    this.setState({
      timelineSize: size,
    });
  };

  openModal = (name) => {
    this.setState({
      activeModalName: name,
    });
  };

  queueModal = (name) => {
    if (
      this.state.activeModalName !== name
    ) {
      if (
        this.state.activeModalName !== null &&
        this.state.activeModalQueue.indexOf(name) === -1
      ) {
        this.setState((prevState) => {
          return {
            activeModalQueue: [name].concat(
              prevState.activeModalQueue
            ),
          };
        });
      } else {
        this.openModal(name);
      }
    }
  };

  closeActiveModal = () => {
    let oldQueue =
      [].concat(
        this.state.activeModalQueue
      );

    if (oldQueue.length === 0) {
      this.openModal(null);
      return;
    }

    var newModalName =
      oldQueue.shift();

    this.setState(
      {
        activeModalQueue: oldQueue,
      },
      () => this.openModal(newModalName)
    );
  };

  toggleCodeEditor = (state) => {
    if (
      state === undefined ||
      typeof state !== 'boolean'
    ) {
      state =
        !this.state.codeEditorOpen;
    }

    this.setState({
      codeEditorOpen: state,
    });
  };

  toggleCanvasActions = (state) => {
    if (
      state === undefined ||
      typeof state !== 'boolean'
    ) {
      state =
        !this.state.showCanvasActions;
    }

    this.setState({
      showCanvasActions: state,
    });
  };

  toggleBrushModes = (state) => {
    if (
      state === undefined ||
      typeof state !== 'boolean'
    ) {
      state =
        !this.state.showBrushModes;
    }

    this.setState({
      showBrushModes: state,
      showCursorTransformModes: false,
      showGradientToolModes: false,
    });
  };

  toggleCursorTransformModes = (state) => {
    if (
      state === undefined ||
      typeof state !== 'boolean'
    ) {
      state =
        !this.state.showCursorTransformModes;
    }

    this.setState({
      showBrushModes: false,
      showCursorTransformModes: state,
      showGradientToolModes: false,
    });
  };

  toggleGradientToolModes = (state) => {
    if (
      state === undefined ||
      typeof state !== 'boolean'
    ) {
      state =
        !this.state.showGradientToolModes;
    }

    this.setState({
      showBrushModes: false,
      showCursorTransformModes: false,
      showGradientToolModes: state,
    });
  };

  showCodeErrors = (errors) => {
    this.setState({
      codeEditorOpen:
        errors === undefined
          ? this.state.codeEditorOpen
          : true,
    });

    if (errors && errors.length > 0) {
      let uuid = errors[0].uuid;

      let obj =
        window.Wick.ObjectCache
          .getObjectByUUID(uuid);

      this.setFocusObject(
        obj.parentClip
      );

      this.selectObject(obj);

      this.projectDidChange({
        actionName:
          'Show Code Errors',
      });
    }
  };

  changeOnionSkinningColors = (colors) => {
    if (!colors) return;

    this.setState({
      customOnionSkinningColors: {
        backward:
          colors.backward ||
          this.state
            .customOnionSkinningColors
            .backward,

        forward:
          colors.forward ||
          this.state
            .customOnionSkinningColors
            .forward,
      },
    });
  };

  /*
   * IMPORTANT:
   * Set attributes on the actual selected objects.
   * This is needed for Clip setters such as clipType,
   * animationType, and singleFrameNumber to run correctly.
   */
  setSelectionAttribute = (attribute, newValue) => {
    const selectedObjects =
      this.project.selection.getSelectedObjects();

    if (
      !selectedObjects ||
      selectedObjects.length === 0
    ) {
      return;
    }

    selectedObjects.forEach((object) => {
      if (!object) return;

      object[attribute] = newValue;
    });

    this.projectDidChange({
      actionName:
        'Set Selection Attribute: ' +
        attribute +
        ':' +
        newValue,
    });
  };

  projectDidChange = (options) => {
    if (!options) options = {};

    if (!options.actionName) {
      options.name = 'Unknown Action';
    }

    this.requestAutosave();

    if (!options.skipHistory) {
      this.project.history.pushState(
        window.Wick.History.StateType
          .ONLY_VISIBLE_OBJECTS,
        options.actionName
      );
    }

    this.project.view.render();
    this.project.guiElement.draw();

    if (!options.skipReactRender) {
      this.setState({
        project: '' + Math.random(),
      });
    }
  };

  toast = (
    message,
    type,
    options
  ) => {
    if (!message) {
      console.error(
        'toast() requires a message.'
      );
      return;
    }

    if (!type) type = 'info';

    if (
      ['info', 'success', 'warning', 'error']
        .indexOf(type) === -1
    ) {
      console.error(
        'toast(): Invalid type: ' + type
      );
      return;
    }

    if (!options) options = {};

    let defaultOptions = {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className:
        type + '-toast-background',
      bodyClassName:
        type + '-toast-body',
      progressClassName:
        type + '-toast-progress',
    };

    let mixOptions = Object.assign(
      defaultOptions,
      options
    );

    return toast[type](
      message,
      mixOptions
    );
  };

  updateToast = (id, options) => {
    if (options.text) {
      options.render = options.text;
    }

    if (options.type) {
      options.className =
        options.type +
        '-toast-background';

      options.bodyClassName =
        options.type +
        '-toast-body';
    }

    if (!options.autoClose) {
      options.autoClose = 5000;
    }

    toast.update(id, options);
  };

  openWarningModal = (args) => {
    let modalInfo = {
      description:
        args.description ||
        'No Description',

      title:
        args.title ||
        'Title',

      acceptAction:
        args.acceptAction ||
        (() => {
          console.warn(
            'No accept action implemented.'
          );
        }),

      cancelAction:
        args.cancelAction ||
        (() => {
          console.warn(
            'No cancel action implemented.'
          );
        }),

      finalAction:
        args.finalAction ||
        (() => {
          console.warn(
            'No final action implemented.'
          );
        }),

      acceptText:
        args.acceptText ||
        'Accept',

      acceptIcon:
        args.acceptIcon,

      cancelText:
        args.cancelText ||
        'Cancel',

      cancelIcon:
        args.cancelIcon,
    };

    this.setState({
      warningModalInfo: modalInfo,
      activeModalName:
        'GeneralWarning',
    });
  };

  combineHotKeys = (
    hotkeys1,
    hotkeys2
  ) => {
    let newHotKeys = {
      ...hotkeys1,
      ...hotkeys2,
    };

    let keys1 =
      Object.keys(hotkeys1);

    let keys2 =
      Object.keys(hotkeys2);

    let similarKeys =
      keys2.filter(
        (key) =>
          keys1.indexOf(key) > -1
      );

    similarKeys.forEach((key) => {
      let combinedKey = {
        ...hotkeys1[key],
        ...hotkeys2[key],
      };

      newHotKeys[key] =
        combinedKey;
    });

    return newHotKeys;
  };

  convertHotkeyArray = (
    hotkeys
  ) => {
    let keyObj = {};

    hotkeys.forEach((key) => {
      if (keyObj[key.actionName]) {
        keyObj[key.actionName][
          key.index
        ] = key.sequence;
      } else {
        keyObj[key.actionName] = {};
        keyObj[key.actionName][
          key.index
        ] = key.sequence;
      }
    });

    return keyObj;
  };

  createCombinedHotKeyMap = (
    hotKeyMap,
    hotKeyArray
  ) => {
    return this.combineHotKeys(
      hotKeyMap,
      this.convertHotkeyArray(
        hotKeyArray
      )
    );
  };

  addCustomHotKeys = (
    newHotKeys
  ) => {
    let combined =
      this.createCombinedHotKeyMap(
        this.state.customHotKeys,
        newHotKeys
      );

    this.syncHotKeys(combined);
  };

  syncHotKeys = (
    hotkeys
  ) => {
    this.hotKeyInterface
      .setCustomHotKeys(hotkeys);

    localForage.setItem(
      this.customHotKeysKey,
      hotkeys
    );

    this.setState({
      customHotKeys: hotkeys,
    });
  };

  resetCustomHotKeys = () => {
    this.syncHotKeys({});
  };

  get processingAction() {
    return this._processingAction;
  }

  set processingAction(
    processingAction
  ) {
    this._processingAction =
      processingAction;
  }

  handleAssetFileImport = (
    e
  ) => {
    this.createAssets(
      e.target.files,
      []
    );
  };

  openProjectFileDialog = () => {
    this.openProjectFileFromClient();
  };

  openImportAssetFileDialog = () => {
    this.openAssetFileFromClient();
  };

  getKeyMap = (
    fullKeyMap
  ) => {
    if (
      this.state.previewPlaying &&
      !fullKeyMap
    ) {
      return this.hotKeyInterface
        .getEssentialKeyMap(
          this.state.customHotKeys
        );
    }

    return this.hotKeyInterface
      .getKeyMap(
        this.state.customHotKeys
      );
  };

  getKeyHandlers = (
    fullKeyHandlers
  ) => {
    if (
      this.state.previewPlaying &&
      !fullKeyHandlers
    ) {
      return this.hotKeyInterface
        .getEssentialKeyHandlers(
          this.state.customHotKeys
        );
    }

    return this.hotKeyInterface
      .getHandlers(
        this.state.customHotKeys
      );
  };

  getRenderSize = () => {
    if (window.innerWidth > 1200) {
      return 'large';
    } else if (
      window.innerWidth > 800
    ) {
      return 'medium';
    }

    return 'small';
  };

  setConsoleLogs = (
    logs
  ) => {
    this.setState({
      consoleLogs: logs,
    });
  };

  render = () => {
    window.project =
      this.project;

    window.editor =
      this;

    let renderSize =
      this.getRenderSize();

    return (
      <DndProvider backend={HTML5Backend}>
        <EditorWrapper editor={this}>
          <div id="menu-bar-container">
            <DockedPanel
              showOverlay={
                this.state.previewPlaying
              }
            >
              <MenuBar
                renderSize={
                  renderSize
                }
                openModal={
                  this.openModal
                }
                projectName={
                  this.project.name
                }
                openProjectFileDialog={
                  this.openProjectFileDialog
                }
                openNewProjectConfirmation={
                  this.openNewProjectConfirmation
                }
                exportProjectAsWickFile={
                  this.exportProjectAsWickFile
                }
                importProjectAsWickFile={
                  this.importProjectAsWickFile
                }
                exporting={
                  this.state.exporting
                }
                toast={this.toast}
                openExportMedia={() => {
                  this.openModal(
                    'ExportMedia'
                  );
                }}
                openExportOptions={() => {
                  this.openModal(
                    'ExportOptions'
                  );
                }}
              />
            </DockedPanel>
          </div>

          <div id="editor-body">
            <div
              className={classNames(
                {
                  'mobile-editor-body':
                    renderSize ===
                    'small',
                }
              )}
              id="flexible-container"
            >
              <ReflexContainer
                windowResizeAware={true}
                orientation="vertical"
              >
                <ReflexElement
                  {...this.resizeProps}
                >
                  <div
                    className={classNames(
                      'toolbox-container',
                      {
                        'toolbox-container-medium':
                          renderSize ===
                          'medium',
                      },
                      {
                        'toolbox-container-small':
                          renderSize ===
                          'small',
                      }
                    )}
                  >
                    <DockedPanel
                      showOverlay={
                        this.state
                          .previewPlaying
                      }
                    >
                      <Toolbox
                        project={
                          this.state
                            .project
                        }
                        getActiveToolName={() =>
                          this.getActiveTool()
                            .name
                        }
                        activeToolName={
                          this.getActiveTool()
                            .name
                        }
                        setActiveTool={
                          this.setActiveTool
                        }
                        getToolSetting={
                          this.getToolSetting
                        }
                        setToolSetting={
                          this.setToolSetting
                        }
                        previewPlaying={
                          this.state
                            .previewPlaying
                        }
                        editorActions={
                          this
                            .actionMapInterface
                            .editorActions
                        }
                        getToolSettingRestrictions={
                          this
                            .getToolSettingRestrictions
                        }
                        showCanvasActions={
                          this.state
                            .showCanvasActions
                        }
                        showBrushModes={
                          this.state
                            .showBrushModes
                        }
                        showCursorTransformModes={
                          this.state
                            .showCursorTransformModes
                        }
                        showGradientToolModes={
                          this.state
                            .showGradientToolModes
                        }
                        toggleCanvasActions={
                          this
                            .toggleCanvasActions
                        }
                        toggleBrushModes={
                          this
                            .toggleBrushModes
                        }
                        toggleCursorTransformModes={
                          this
                            .toggleCursorTransformModes
                        }
                        toggleGradientToolModes={
                          this
                            .toggleGradientToolModes
                        }
                        colorPickerType={
                          this.state
                            .colorPickerType
                        }
                        changeColorPickerType={
                          this
                            .changeColorPickerType
                        }
                        updateLastColors={
                          this
                            .updateLastColors
                        }
                        lastColorsUsed={
                          this.state
                            .lastColorsUsed
                        }
                        keyMap={
                          this.getKeyMap()
                        }
                        renderSize={
                          renderSize
                        }
                      />
                    </DockedPanel>
                  </div>

                  <div
                    className={classNames(
                      'editor-canvas-timeline-panel',
                      {
                        'editor-canvas-timeline-panel-medium':
                          renderSize ===
                          'medium',
                      },
                      {
                        'editor-canvas-timeline-panel-small':
                          renderSize ===
                          'small',
                      }
                    )}
                  >
                    <ReflexContainer
                      windowResizeAware={true}
                      orientation="horizontal"
                    >
                      <ReflexElement>
                        <ReflexContainer
                          windowResizeAware={true}
                          orientation="vertical"
                        >
                          <ReflexElement
                            {...this.resizeProps}
                          >
                            <DockedPanel>
                              <SizeMe>
                                {({
                                  size,
                                }) => {
                                  this.project.view.render();

                                  return (
                                    <Canvas
                                      editor={
                                        this
                                      }
                                      project={
                                        this
                                          .project
                                      }
                                      projectDidChange={
                                        this
                                          .projectDidChange
                                      }
                                      projectData={
                                        this
                                          .state
                                          .project
                                      }
                                      paper={
                                        this
                                          .paper
                                      }
                                      previewPlaying={
                                        this
                                          .state
                                          .previewPlaying
                                      }
                                      createImageFromAsset={
                                        this
                                          .createImageFromAsset
                                      }
                                      toast={
                                        this
                                          .toast
                                      }
                                      onEyedropperPickedColor={
                                        this
                                          .onEyedropperPickedColor
                                      }
                                      createAssets={
                                        this
                                          .createAssets
                                      }
                                      importProjectAsWickFile={
                                        this
                                          .importProjectAsWickFile
                                      }
                                      onRef={
                                        ref =>
                                          (this.canvasComponent =
                                            ref)
                                      }
                                    />
                                  );
                                }}
                              </SizeMe>

                              <CanvasTransforms
                                onionSkinEnabled={
                                  this
                                    .project
                                    .onionSkinEnabled
                                }
                                toggleOnionSkin={
                                  this
                                    .toggleOnionSkin
                                }
                                zoomIn={
                                  this.zoomIn
                                }
                                zoomOut={
                                  this.zoomOut
                                }
                                recenterCanvas={
                                  this
                                    .recenterCanvas
                                }
                                activeToolName={
                                  this
                                    .getActiveTool()
                                    .name
                                }
                                setActiveTool={
                                  this
                                    .setActiveTool
                                }
                                previewPlaying={
                                  this
                                    .state
                                    .previewPlaying
                                }
                                togglePreviewPlaying={
                                  this
                                    .togglePreviewPlaying
                                }
                                renderSize={
                                  renderSize
                                }
                                keyMap={
                                  this.getKeyMap()
                                }
                              />

                              {renderSize ===
                                'small' && (
                                <DeleteCopyPaste
                                  previewPlaying={
                                    this
                                      .state
                                      .previewPlaying
                                  }
                                  selectionEmpty={
                                    this
                                      .project
                                      .selection
                                      .getSelectedObjects()
                                      .length ===
                                    0
                                  }
                                  editorActions={
                                    this
                                      .actionMapInterface
                                      .editorActions
                                  }
                                />
                              )}

                              {renderSize ===
                                'large' && (
                                <OutlinerExpandButton
                                  expanded={
                                    this
                                      .state
                                      .outlinerPoppedOut
                                  }
                                  toggleOutliner={
                                    this
                                      .toggleOutliner
                                  }
                                />
                              )}
                            </DockedPanel>
                          </ReflexElement>

                          {renderSize ===
                            'large' &&
                            this.state
                              .outlinerPoppedOut && (
                              <ReflexSplitter
                                {...this.resizeProps}
                              />
                            )}

                          {renderSize ===
                            'large' &&
                            this.state
                              .outlinerPoppedOut && (
                              <ReflexElement
                                size={250}
                                maxSize={300}
                                minSize={200}
                                onResize={
                                  this
                                    .resizeProps
                                    .onResize
                                }
                                onStopResize={
                                  this
                                    .resizeProps
                                    .onStopPopoutOutlinerResize
                                }
                              >
                                <Outliner
                                  className="popout-outliner"
                                  project={
                                    this
                                      .project
                                  }
                                  selectObjects={
                                    this
                                      .selectObjects
                                  }
                                  deselectObjects={
                                    this
                                      .deselectObjects
                                  }
                                  clearSelection={
                                    this
                                      .clearSelection
                                  }
                                  editScript={
                                    this
                                      .editScript
                                  }
                                  setFocusObject={
                                    this
                                      .setFocusObject
                                  }
                                  setActiveLayerIndex={
                                    this
                                      .setActiveLayerIndex
                                  }
                                  moveSelection={
                                    this
                                      .moveSelection
                                  }
                                  toggleHidden={
                                    this
                                      .toggleHidden
                                  }
                                  toggleLocked={
                                    this
                                      .toggleLocked
                                  }
                                />
                              </ReflexElement>
                            )}
                        </ReflexContainer>
                      </ReflexElement>

                      {renderSize ===
                        'small' && (
                        <ReflexSplitter
                          {...this.resizeProps}
                          className="mobile-reflex-splitter"
                        />
                      )}

                      {renderSize !==
                        'small' && (
                        <ReflexSplitter
                          {...this.resizeProps}
                        />
                      )}

                      <ReflexElement
                        minSize={100}
                        size={
                          this.state
                            .timelineSize
                        }
                        onResize={
                          this.resizeProps
                            .onResize
                        }
                        onStopResize={
                          this.resizeProps
                            .onStopTimelineResize
                        }
                      >
                        <DockedPanel
                          showOverlay={
                            this.state
                              .previewPlaying
                          }
                        >
                          {renderSize ===
                            'small' && (
                            <MobileContainer
                              project={
                                this
                                  .project
                              }
                              projectDidChange={
                                this
                                  .projectDidChange
                              }
                              projectData={
                                this
                                  .state
                                  .project
                              }
                              getSelectedTimelineObjects={
                                this
                                  .getSelectedTimelineObjects
                              }
                              setOnionSkinOptions={
                                this
                                  .setOnionSkinOptions
                              }
                              getOnionSkinOptions={
                                this
                                  .getOnionSkinOptions
                              }
                              setFocusObject={
                                this
                                  .setFocusObject
                              }
                              addTweenKeyframe={
                                this
                                  .addTweenKeyframe
                              }
                              onRef={
                                ref =>
                                  (this.timelineComponent =
                                    ref)
                              }
                              dragSoundOntoTimeline={
                                this
                                  .dragSoundOntoTimeline
                              }
                              getToolSetting={
                                this
                                  .getToolSetting
                              }
                              setToolSetting={
                                this
                                  .setToolSetting
                              }
                              getActiveTool={
                                this
                                  .getActiveTool
                              }
                              getSelectionType={
                                this
                                  .getSelectionType
                              }
                              getAllSoundAssets={
                                this
                                  .getAllSoundAssets
                              }
                              getAllSelectionAttributes={
                                this
                                  .getAllSelectionAttributes
                              }
                              setSelectionAttribute={
                                this
                                  .setSelectionAttribute
                              }
                              editorActions={
                                this
                                  .actionMapInterface
                                  .editorActions
                              }
                              selectionIsScriptable={
                                this
                                  .selectionIsScriptable
                              }
                              script={
                                this
                                  .getSelectedObjectScript()
                              }
                              scriptInfoInterface={
                                this
                                  .scriptInfoInterface
                              }
                              deleteScript={
                                this
                                  .deleteScript
                              }
                              editScript={
                                this
                                  .editScript
                              }
                              fontInfoInterface={
                                this
                                  .fontInfoInterface
                              }
                              importFileAsAsset={
                                this
                                  .importFileAsAsset
                              }
                              colorPickerType={
                                this
                                  .state
                                  .colorPickerType
                              }
                              changeColorPickerType={
                                this
                                  .changeColorPickerType
                              }
                              updateLastColors={
                                this
                                  .updateLastColors
                              }
                              lastColorsUsed={
                                this
                                  .state
                                  .lastColorsUsed
                              }
                              getClipAnimationTypes={
                                this
                                  .getClipAnimationTypes
                              }
                              assets={
                                this
                                  .project
                                  .getAssets()
                              }
                              openModal={
                                this
                                  .openModal
                              }
                              openImportAssetFileDialog={
                                this
                                  .openImportAssetFileDialog
                              }
                              selectObjects={
                                this
                                  .selectObjects
                              }
                              clearSelection={
                                this
                                  .clearSelection
                              }
                              isObjectSelected={
                                this
                                  .isObjectSelected
                              }
                              createAssets={
                                this
                                  .createAssets
                              }
                              importProjectAsWickFile={
                                this
                                  .importProjectAsWickFile
                              }
                              createImageFromAsset={
                                this
                                  .createImageFromAsset
                              }
                              toast={
                                this
                                  .toast
                              }
                              deleteSelectedObjects={
                                this
                                  .deleteSelectedObjects
                              }
                              addSoundToActiveFrame={
                                this
                                  .addSoundToActiveFrame
                              }
                            />
                          )}

                          {renderSize !==
                            'small' && (
                            <Timeline
                              project={
                                this
                                  .project
                              }
                              projectDidChange={
                                this
                                  .projectDidChange
                              }
                              projectData={
                                this
                                  .state
                                  .project
                              }
                              getSelectedTimelineObjects={
                                this
                                  .getSelectedTimelineObjects
                              }
                              setOnionSkinOptions={
                                this
                                  .setOnionSkinOptions
                              }
                              getOnionSkinOptions={
                                this
                                  .getOnionSkinOptions
                              }
                              setFocusObject={
                                this
                                  .setFocusObject
                              }
                              addTweenKeyframe={
                                this
                                  .addTweenKeyframe
                              }
                              onRef={
                                ref =>
                                  (this.timelineComponent =
                                    ref)
                              }
                              dragSoundOntoTimeline={
                                this
                                  .dragSoundOntoTimeline
                              }
                            />
                          )}
                        </DockedPanel>
                      </ReflexElement>
                    </ReflexContainer>
                  </div>
                </ReflexElement>

                {renderSize !==
                  'small' && (
                  <ReflexSplitter
                    {...this.resizeProps}
                  />
                )}

                {renderSize !==
                  'small' && (
                  <ReflexElement
                    size={250}
                    maxSize={300}
                    minSize={200}
                    onResize={
                      this.resizeProps
                        .onResize
                    }
                    onStopResize={
                      this.resizeProps
                        .onStopInspectorResize
                    }
                  >
                    <ReflexContainer
                      windowResizeAware={true}
                      orientation="horizontal"
                    >
                      <ReflexElement
                        {...this.resizeProps}
                      >
                        <DockedPanel
                          showOverlay={
                            this.state
                              .previewPlaying
                          }
                        >
                          <Inspector
                            getToolSetting={
                              this.getToolSetting
                            }
                            setToolSetting={
                              this.setToolSetting
                            }
                            getActiveTool={
                              this.getActiveTool
                            }
                            getSelectionType={
                              this.getSelectionType
                            }
                            getAllSoundAssets={
                              this.getAllSoundAssets
                            }
                            getAllSelectionAttributes={
                              this.getAllSelectionAttributes
                            }
                            setSelectionAttribute={
                              this
                                .setSelectionAttribute
                            }
                            editorActions={
                              this
                                .actionMapInterface
                                .editorActions
                            }
                            selectionIsScriptable={
                              this
                                .selectionIsScriptable
                            }
                            script={
                              this
                                .getSelectedObjectScript()
                            }
                            scriptInfoInterface={
                              this
                                .scriptInfoInterface
                            }
                            deleteScript={
                              this
                                .deleteScript
                            }
                            editScript={
                              this
                                .editScript
                            }
                            fontInfoInterface={
                              this
                                .fontInfoInterface
                            }
                            project={
                              this
                                .project
                            }
                            importFileAsAsset={
                              this
                                .importFileAsAsset
                            }
                            colorPickerType={
                              this.state
                                .colorPickerType
                            }
                            changeColorPickerType={
                              this
                                .changeColorPickerType
                            }
                            updateLastColors={
                              this
                                .updateLastColors
                            }
                            lastColorsUsed={
                              this.state
                                .lastColorsUsed
                            }
                            getClipAnimationTypes={
                              this
                                .getClipAnimationTypes
                            }

                            /*
                             * CLIP TYPES
                             */
                            getClipTypes={() => {
                              if (
                                window.Wick &&
                                window.Wick.Clip &&
                                window.Wick.Clip.clipTypes
                              ) {
                                const clipTypes =
                                  window.Wick.Clip.clipTypes;

                                if (Array.isArray(clipTypes)) {
                                  return clipTypes;
                                }

                                return Object.keys(
                                  clipTypes
                                ).map((key) => ({
                                  value: key,
                                  label: clipTypes[key],
                                }));
                              }

                              return [
                                {
                                  value: 'movieClip',
                                  label: 'Movie Clip',
                                },
                                {
                                  value: 'graphic',
                                  label: 'Graphic',
                                },
                              ];
                            }}
                          />
                        </DockedPanel>
                      </ReflexElement>

                      {renderSize ===
                        'medium' && (
                        <ReflexSplitter
                          {...this.resizeProps}
                        />
                      )}

                      {renderSize ===
                        'medium' && (
                        <ReflexElement
                          minSize={100}
                        >
                          <DockedPanel
                            showOverlay={
                              this.state
                                .previewPlaying
                            }
                          >
                            <Outliner
                              project={
                                this
                                  .project
                              }
                              selectObjects={
                                this
                                  .selectObjects
                              }
                              deselectObjects={
                                this
                                  .deselectObjects
                              }
                              clearSelection={
                                this
                                  .clearSelection
                              }
                              editScript={
                                this
                                  .editScript
                              }
                              setFocusObject={
                                this
                                  .setFocusObject
                              }
                              setActiveLayerIndex={
                                this
                                  .setActiveLayerIndex
                              }
                              moveSelection={
                                this
                                  .moveSelection
                              }
                              toggleHidden={
                                this
                                  .toggleHidden
                              }
                              toggleLocked={
                                this
                                  .toggleLocked
                              }
                            />
                          </DockedPanel>
                        </ReflexElement>
                      )}

                      {window.enableAssetLibrary && (
                        <ReflexSplitter
                          {...this.resizeProps}
                        />
                      )}

                      {window.enableAssetLibrary && (
                        <ReflexElement
                          minSize={100}
                          size={300}
                          onResize={
                            this.resizeProps
                              .onResize
                          }
                          onStopResize={
                            this.resizeProps
                              .onStopAssetLibraryResize
                          }
                        >
                          <DockedPanel
                            showOverlay={
                              this.state
                                .previewPlaying
                            }
                          >
                            <AssetLibrary
                              projectData={
                                this
                                  .state
                                  .project
                              }
                              assets={
                                this
                                  .project
                                  .getAssets()
                              }
                              openModal={
                                this
                                  .openModal
                              }
                              openImportAssetFileDialog={
                                this
                                  .openImportAssetFileDialog
                              }
                              selectObjects={
                                this
                                  .selectObjects
                              }
                              clearSelection={
                                this
                                  .clearSelection
                              }
                              isObjectSelected={
                                this
                                  .isObjectSelected
                              }
                              createAssets={
                                this
                                  .createAssets
                              }
                              importProjectAsWickFile={
                                this
                                  .importProjectAsWickFile
                              }
                              createImageFromAsset={
                                this
                                  .createImageFromAsset
                              }
                              toast={
                                this
                                  .toast
                              }
                              deleteSelectedObjects={
                                this
                                  .deleteSelectedObjects
                              }
                              addSoundToActiveFrame={
                                this
                                  .addSoundToActiveFrame
                              }
                            />
                          </DockedPanel>
                        </ReflexElement>
                      )}
                    </ReflexContainer>
                  </ReflexElement>
                )}
              </ReflexContainer>
            </div>

            {this.state.codeEditorOpen && (
              <WickCodeEditor
                selectionType={
                  this.getSelectionType()
                }
                codeEditorWindowProperties={
                  this.state
                    .codeEditorWindowProperties
                }
                updateCodeEditorWindowProperties={
                  this
                    .updateCodeEditorWindowProperties
                }
                scriptInfoInterface={
                  this
                    .scriptInfoInterface
                }
                selectionIsScriptable={
                  this
                    .selectionIsScriptable
                }
                script={
                  this
                    .getSelectedObjectScript()
                }
                scriptToEdit={
                  this.state.scriptToEdit
                }
                error={
                  this.state.codeError
                }
                onScriptUpdate={
                  this.onScriptUpdate
                }
                editScript={
                  this.editScript
                }
                toggleCodeEditor={
                  this.toggleCodeEditor
                }
                requestAutosave={
                  this.requestAutosave
                }
                clearCodeEditorError={
                  this.clearCodeEditorError
                }
                consoleLogs={
                  this.state.consoleLogs
                }
                setConsoleLogs={
                  this.setConsoleLogs
                }
                renderSize={
                  renderSize
                }
              />
            )}
          </div>
        </EditorWrapper>
      </DndProvider>
    );
  };
}

export default Editor;