/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published
 * by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 */

Wick.Clip = class extends Wick.Base {

    constructor(args) {
        args = args || {};

        super(args);

        this.timeline = new Wick.Timeline();
        this.timeline.addLayer(new Wick.Layer());

        if (this.timeline.activeLayer) {
            this.timeline.activeLayer.addFrame(new Wick.Frame());
        }

        this._animationType = 'loop';

        this._clipType =
            args.clipType === 'graphic'
                ? 'graphic'
                : 'movieClip';

        this._singleFrameNumber = 1;
        this._playedOnce = false;
        this._isSynced = false;

        /*
         * Graphic runtime state.
         */
        this._graphicControlled = false;

        this._transformation =
            args.transformation ||
            new Wick.Transformation();

        this.cursor = 'default';

        this._isClone = false;
        this._sourceClipUUID = null;

        this._assetSourceUUID = null;

        this._clones = [];

        if (args.objects) {
            this.addObjects(args.objects);
        }
    }

    static get animationTypes() {
        return {
            loop: 'Loop',
            single: 'Single Frame',
            playOnce: 'Play Once'
        };
    }

    static get clipTypes() {
        return {
            movieClip: 'Movie Clip',
            graphic: 'Graphic'
        };
    }

    _serialize(args) {
        const data = super._serialize(args);

        data.transformation = this.transformation
            ? this.transformation.values
            : null;

        data.animationType = this._animationType;
        data.clipType = this._clipType;
        data.singleFrameNumber = this._singleFrameNumber;
        data.assetSourceUUID = this._assetSourceUUID;
        data.isSynced = this._isSynced;

        return data;
    }

    _deserialize(data) {
        data = data || {};

        super._deserialize(data);

        this.transformation =
            data.transformation
                ? new Wick.Transformation(data.transformation)
                : new Wick.Transformation();

        if (
            data.animationType === 'loop' ||
            data.animationType === 'single' ||
            data.animationType === 'playOnce'
        ) {
            this._animationType = data.animationType;
        } else {
            this._animationType = 'loop';
        }

        this._clipType =
            data.clipType === 'graphic'
                ? 'graphic'
                : 'movieClip';

        let frameNumber = Number(data.singleFrameNumber);

        if (
            !Number.isFinite(frameNumber) ||
            frameNumber < 1
        ) {
            frameNumber = 1;
        }

        this._singleFrameNumber =
            Math.floor(frameNumber);

        this._assetSourceUUID =
            data.assetSourceUUID || null;

        this._isSynced =
            data.isSynced === true;

        this._playedOnce = false;
        this._clones = [];
        this._isClone = false;
        this._sourceClipUUID = null;
        this._graphicControlled = false;

        /*
         * Restore Single Frame position.
         */
        if (
            this._animationType === 'single' &&
            this.timeline &&
            this.timeline.length > 0
        ) {
            this._singleFrameNumber =
                Math.max(
                    1,
                    Math.min(
                        this._singleFrameNumber,
                        this.timeline.length
                    )
                );

            this.timeline.playheadPosition =
                this._singleFrameNumber;
        }
    }

    get classname() {
        return 'Clip';
    }

    get onScreen() {
        if (this.isRoot) {
            return true;
        }

        if (this.parentFrame) {
            return !!this.parentFrame.onScreen;
        }

        return false;
    }

    get isRoot() {
        return !!(
            this.project &&
            this === this.project.root
        );
    }

    get isSynced() {
        return (
            this._isSynced &&
            this.animationType !== 'single' &&
            !this.isRoot
        );
    }

    set isSynced(bool) {
        if (typeof bool !== 'boolean') {
            return;
        }

        this._isSynced = bool;

        if (bool) {
            this.applySyncPosition();
        } else if (
            this.timeline &&
            this.timeline.length > 0
        ) {
            this.timeline.playheadPosition = 1;
        }
    }

    get isFocus() {
        return !!(
            this.project &&
            this === this.project.focus
        );
    }

    get isClone() {
        return this._isClone;
    }

    get sourceClipUUID() {
        return this._sourceClipUUID;
    }

    get sourceClip() {
        if (
            !this.sourceClipUUID ||
            !this.project
        ) {
            return null;
        }

        return this.project.getObjectByUUID(
            this.sourceClipUUID
        );
    }

    get assetSourceUUID() {
        return this._assetSourceUUID;
    }

    set assetSourceUUID(assetSourceUUID) {
        this._assetSourceUUID =
            assetSourceUUID || null;
    }

    get timeline() {
        return this.getChild('Timeline');
    }

    set timeline(timeline) {
        if (!timeline) {
            return;
        }

        const currentTimeline = this.timeline;

        if (
            currentTimeline &&
            currentTimeline !== timeline
        ) {
            this.removeChild(currentTimeline);
        }

        if (this.timeline !== timeline) {
            this.addChild(timeline);
        }
    }

    get animationType() {
        return this._animationType;
    }

    set animationType(animationType) {
        if (
            animationType !== 'loop' &&
            animationType !== 'single' &&
            animationType !== 'playOnce'
        ) {
            console.error(
                'Animation type: ' +
                animationType +
                ' is invalid for clips! Defaulting to Loop.'
            );

            this._animationType = 'loop';
            this.resetTimelinePosition();

            return;
        }

        this._animationType = animationType;

        this.resetTimelinePosition();
    }

    /*
     * ============================================================
     * GRAPHIC FRAME PICKER
     * ============================================================
     */

    get singleFrameNumber() {
        if (this.animationType !== 'single') {
            return null;
        }

        return this._singleFrameNumber;
    }

    set singleFrameNumber(frame) {
        frame = Number(frame);

        if (!Number.isFinite(frame)) {
            frame = 1;
        }

        frame = Math.floor(frame);

        const length =
            this.timeline
                ? this.timeline.length
                : 0;

        if (length <= 0) {
            this._singleFrameNumber = 1;
            return;
        }

        frame = Math.max(
            1,
            Math.min(
                frame,
                length
            )
        );

        this._singleFrameNumber = frame;

        /*
         * Immediately update the displayed Graphic frame.
         */
        if (this.animationType === 'single') {
            this.applySingleFramePosition();
        }
    }

    /*
     * ============================================================
     * SYNCHRONIZATION
     * ============================================================
     */

    get syncFrame() {
        if (
            !this.timeline ||
            this.timeline.length <= 0
        ) {
            return 1;
        }

        if (
            !this.parentClip ||
            !this.parentFrame
        ) {
            return (
                this.timeline.playheadPosition ||
                1
            );
        }

        const parentTimeline =
            this.parentClip.timeline;

        if (!parentTimeline) {
            return 1;
        }

        const timelineOffset =
            parentTimeline.playheadPosition -
            this.parentFrame.start;

        if (
            this.animationType === 'playOnce' &&
            timelineOffset >= this.timeline.length
        ) {
            return this.timeline.length;
        }

        const position =
            (
                (
                    timelineOffset %
                    this.timeline.length
                ) +
                this.timeline.length
            ) %
            this.timeline.length;

        return position + 1;
    }

    get playedOnce() {
        return this._playedOnce;
    }

    set playedOnce(bool) {
        this._playedOnce = !!bool;
    }

    get activeLayer() {
        return this.timeline
            ? this.timeline.activeLayer
            : null;
    }

    get activeFrame() {
        return this.activeLayer
            ? this.activeLayer.activeFrame
            : null;
    }

    get namedChildren() {
        const namedChildren = [];

        if (
            !this.timeline ||
            !this.timeline.frames
        ) {
            return namedChildren;
        }

        this.timeline.frames.forEach(frame => {

            if (frame.identifier) {
                namedChildren.push(frame);
            }

            if (frame.clips) {
                frame.clips.forEach(clip => {

                    if (clip.identifier) {
                        namedChildren.push(clip);
                    }

                });
            }

            if (frame.dynamicTextPaths) {
                frame.dynamicTextPaths.forEach(path => {

                    if (path.identifier) {
                        namedChildren.push(path);
                    }

                });
            }

        });

        return namedChildren;
    }

    get activeNamedChildren() {
        return this.namedChildren.filter(
            child => child.onScreen
        );
    }

    /*
     * ============================================================
     * POSITION CONTROL
     * ============================================================
     */

    resetTimelinePosition() {
        if (
            !this.timeline ||
            this.timeline.length <= 0
        ) {
            return;
        }

        if (this.animationType === 'single') {
            this.applySingleFramePosition();
        } else {
            this.timeline.playheadPosition = 1;
        }

        this._playedOnce = false;
        this._graphicControlled = false;
    }

    applySingleFramePosition() {
        if (
            this.animationType !== 'single' ||
            !this.timeline ||
            this.timeline.length <= 0
        ) {
            return;
        }

        let frame =
            Number(this._singleFrameNumber);

        if (!Number.isFinite(frame)) {
            frame = 1;
        }

        frame = Math.floor(frame);

        frame =
            Math.max(
                1,
                Math.min(
                    frame,
                    this.timeline.length
                )
            );

        this._singleFrameNumber = frame;

        this.timeline.playheadPosition = frame;
    }

    applySyncPosition() {
        if (
            this.isSynced &&
            this.timeline &&
            this.timeline.length > 0
        ) {
            this.timeline.playheadPosition =
                this.syncFrame;
        }
    }

    /*
     * ============================================================
     * GRAPHIC TIMELINE
     * ============================================================
     */

    updateGraphicTimelinePosition() {
        if (
            this._clipType !== 'graphic' ||
            this.animationType === 'single' ||
            !this.timeline ||
            this.timeline.length <= 0 ||
            !this.parentClip ||
            !this.parentFrame ||
            !this.parentClip.timeline
        ) {
            return;
        }

        const parentTimeline =
            this.parentClip.timeline;

        let parentPosition =
            Number(parentTimeline.playheadPosition);

        if (!Number.isFinite(parentPosition)) {
            parentPosition = 1;
        }

        let start =
            Number(this.parentFrame.start);

        let end =
            Number(this.parentFrame.end);

        if (!Number.isFinite(start)) {
            start = 1;
        }

        if (!Number.isFinite(end)) {
            end = start;
        }

        const exposureLength =
            Math.max(
                1,
                end - start + 1
            );

        let offset =
            parentPosition - start;

        /*
         * Loop through the Graphic while the parent
         * exposure is active.
         */
        if (exposureLength > 1) {
            offset =
                (
                    (
                        offset %
                        exposureLength
                    ) +
                    exposureLength
                ) %
                exposureLength;
        } else {
            offset = 0;
        }

        const progress =
            exposureLength <= 1
                ? 0
                : offset /
                    (exposureLength - 1);

        const position =
            1 +
            progress *
            (this.timeline.length - 1);

        this.timeline.playheadPosition =
            Math.max(
                1,
                Math.min(
                    this.timeline.length,
                    position
                )
            );
    }

    updateTimelineForAnimationType() {
        if (
            !this.timeline ||
            this.timeline.length <= 0
        ) {
            return;
        }

        if (this.animationType === 'single') {
            this.applySingleFramePosition();
            return;
        }

        if (this._clipType === 'graphic') {
            this.updateGraphicTimelinePosition();
            return;
        }

        if (this.isSynced) {
            this.applySyncPosition();
        }
    }

    /*
     * ============================================================
     * CLONE / OBJECT FUNCTIONS
     * ============================================================
     */

    removeClone(uuid) {
        if (
            this.isClone ||
            !Array.isArray(this._clones)
        ) {
            return;
        }

        this._clones =
            this._clones.filter(
                obj =>
                    obj &&
                    obj.uuid !== uuid
            );
    }

    remove() {
        if (
            !this.parent ||
            this._willBeRemoved
        ) {
            return;
        }

        this._willBeRemoved = true;

        this.runScript('unload');

        if (this.sourceClip) {
            this.sourceClip.removeClone(
                this.uuid
            );
        }

        if (this.parent.removeClip) {
            this.parent.removeClip(this);
        }

        this.removed = true;
    }

    breakApart() {
        const leftovers = [];

        if (
            !this.parentFrame ||
            !this.parentTimeline
        ) {
            return leftovers;
        }

        const destinationFrame =
            this.parentTimeline.activeFrame;

        if (!destinationFrame) {
            return leftovers;
        }

        if (
            !this.timeline ||
            !this.timeline.activeFrames
        ) {
            this.remove();
            return leftovers;
        }

        this.timeline.activeFrames.forEach(frame => {

            if (frame.clips) {
                frame.clips
                    .slice()
                    .forEach(clip => {

                        clip.transformation.x +=
                            this.transformation.x;

                        clip.transformation.y +=
                            this.transformation.y;

                        destinationFrame.addClip(
                            clip
                        );

                        leftovers.push(clip);
                    });
            }

            if (frame.paths) {
                frame.paths
                    .slice()
                    .forEach(path => {

                        path.x +=
                            this.transformation.x;

                        path.y +=
                            this.transformation.y;

                        destinationFrame.addPath(
                            path
                        );

                        leftovers.push(path);
                    });
            }

        });

        this.remove();

        return leftovers;
    }

    addObjects(objects) {
        if (
            !Array.isArray(objects) ||
            !this.activeFrame
        ) {
            return;
        }

        objects.forEach(object => {

            if (!object) {
                return;
            }

            if (
                typeof object.x === 'number' &&
                typeof object.y === 'number'
            ) {
                object.x -=
                    this.transformation.x;

                object.y -=
                    this.transformation.y;
            }

            if (object instanceof Wick.Clip) {
                this.activeFrame.addClip(object);
            } else if (
                object instanceof Wick.Path
            ) {
                this.activeFrame.addPath(object);
            }

        });
    }

    stop() {
        if (this.timeline) {
            this.timeline.stop();
        }
    }

    play() {
        if (this.timeline) {
            this.timeline.play();
        }
    }

    gotoAndStop(frame) {
        if (this.timeline) {
            this.timeline.gotoAndStop(frame);
        }
    }

    gotoAndPlay(frame) {
        if (this.timeline) {
            this.timeline.gotoAndPlay(frame);
        }
    }

    gotoNextFrame() {
        if (this.timeline) {
            this.timeline.gotoNextFrame();
        }
    }

    gotoPrevFrame() {
        if (this.timeline) {
            this.timeline.gotoPrevFrame();
        }
    }

    /*
     * ============================================================
     * TRANSFORMATION
     * ============================================================
     */

    get transformation() {
        return this._transformation;
    }

    set transformation(transformation) {
        if (
            transformation instanceof
            Wick.Transformation
        ) {
            this._transformation =
                transformation;
        }
    }

    get x() {
        return this.transformation.x;
    }

    set x(x) {
        if (Number.isFinite(x)) {
            this.transformation.x = x;
        }
    }

    get y() {
        return this.transformation.y;
    }

    set y(y) {
        if (Number.isFinite(y)) {
            this.transformation.y = y;
        }
    }

    get rotation() {
        return this.transformation.rotation;
    }

    set rotation(rotation) {
        if (Number.isFinite(rotation)) {
            this.transformation.rotation = rotation;
        }
    }

    get skew() {
        return this.transformation.skew;
    }

    set skew(skew) {
        if (Number.isFinite(skew)) {
            this.transformation.skew = skew;
        }
    }

    get opacity() {
        return this.transformation.opacity;
    }

    set opacity(opacity) {
        if (!Number.isFinite(opacity)) {
            return;
        }

        opacity = Math.max(
            0,
            Math.min(
                1,
                opacity
            )
        );

        this.transformation.opacity =
            opacity;
    }

    /*
     * ============================================================
     * CLONING
     * ============================================================
     */

    clone() {
        if (!this.parentFrame) {
            return null;
        }

        const clone = this.copy();

        clone.identifier = null;

        this.parentFrame.addClip(clone);

        if (!Array.isArray(this._clones)) {
            this._clones = [];
        }

        this._clones.push(clone);

        clone._isClone = true;
        clone._sourceClipUUID = this.uuid;

        return clone;
    }

    get clones() {
        if (!Array.isArray(this._clones)) {
            this._clones = [];
        }

        return this._clones;
    }

    setText() {
        throw new Error(
            'setText() can only be used with text objects.'
        );
    }

    get lineage() {
        if (
            this.isRoot ||
            !this.parentClip
        ) {
            return [this];
        }

        return [
            this,
            ...this.parentClip.lineage
        ];
    }

    /*
     * ============================================================
     * PLACEHOLDER
     * ============================================================
     */

    ensureActiveFrameIsContentful() {
        if (!this.timeline) {
            return;
        }

        if (!this.timeline.activeLayer) {
            this.timeline.addLayer(
                new Wick.Layer()
            );
        }

        let playheadPosition =
            this.timeline.playheadPosition;

        if (
            !Number.isFinite(playheadPosition) ||
            playheadPosition < 1
        ) {
            playheadPosition = 1;
            this.timeline.playheadPosition = 1;
        }

        let frames =
            this.timeline
                .getFramesAtPlayheadPosition(
                    playheadPosition
                );

        if (
            !frames ||
            frames.length === 0
        ) {
            this.timeline.activeLayer.addFrame(
                new Wick.Frame({
                    start: playheadPosition
                })
            );

            frames =
                this.timeline
                    .getFramesAtPlayheadPosition(
                        playheadPosition
                    );
        }

        if (
            !frames ||
            frames.length === 0
        ) {
            return;
        }

        frames.forEach(frame => {

            if (!frame.paths) {
                return;
            }

            frame.paths
                .slice()
                .forEach(path => {

                    if (path.isPlaceholder) {
                        path.remove();
                    }

                });

        });

        let contentful = false;

        frames.forEach(frame => {

            if (frame.contentful) {
                contentful = true;
            }

        });

        if (contentful) {
            return;
        }

        const frame = frames[0];

        if (!frame) {
            return;
        }

        if (frame.paths) {
            frame.paths
                .slice()
                .forEach(path => path.remove());
        }

        const size =
            Wick.View.Clip.PLACEHOLDER_SIZE;

        const line1 =
            new paper.Path.Line({
                from: [0, -size],
                to: [0, size],
                strokeColor: '#AAA'
            });

        line1.remove();

        frame.addPath(
            new Wick.Path({
                path: line1,
                isPlaceholder: true
            })
        );

        const line2 =
            new paper.Path.Line({
                from: [-size, 0],
                to: [size, 0],
                strokeColor: '#AAA'
            });

        line2.remove();

        frame.addPath(
            new Wick.Path({
                path: line2,
                isPlaceholder: true
            })
        );
    }

    /*
     * ============================================================
     * ACTIVATION
     * ============================================================
     */

    _onInactive() {
        super._onInactive();

        /*
         * Do not reset Graphic position or selection.
         */
    }

    _onActivated() {
        super._onActivated();

        /*
         * Movie Clip Play Once restarts when activated.
         * Graphics do not get this reset.
         */
        if (
            this._clipType !== 'graphic' &&
            this.animationType === 'playOnce'
        ) {
            this.playedOnce = false;

            if (
                this.timeline &&
                this.timeline.length > 0
            ) {
                this.timeline.playheadPosition = 1;
            }
        }

        /*
         * Always restore the selected Single Frame.
         */
        if (
            this.animationType === 'single' &&
            this.timeline &&
            this.timeline.length > 0
        ) {
            this.applySingleFramePosition();
        }
    }

    /*
     * ============================================================
     * MAIN PLAYBACK
     * ============================================================
     */

    _onActive() {
        super._onActive();

        if (
            !this.timeline ||
            this.timeline.length <= 0
        ) {
            this._tickChildren();
            return;
        }

        /*
         * ========================================================
         * GRAPHIC
         * ========================================================
         */

        if (
            this._clipType === 'graphic'
        ) {

            /*
             * GRAPHIC + SINGLE FRAME
             */
            if (
                this.animationType === 'single'
            ) {
                this.applySingleFramePosition();

                /*
                 * Children still receive ticks, so a nested
                 * Movie Clip can continue to animate.
                 */
                this._tickChildren();

                return;
            }

            /*
             * GRAPHIC + LOOP
             */
            if (
                this.animationType === 'loop'
            ) {
                this.updateGraphicTimelinePosition();

                this._tickChildren();

                return;
            }

            /*
             * GRAPHIC + PLAY ONCE
             */
            if (
                this.animationType === 'playOnce'
            ) {
                this.updateGraphicTimelinePosition();

                this._tickChildren();

                return;
            }

            this._tickChildren();

            return;
        }

        /*
         * ========================================================
         * MOVIE CLIP
         * ========================================================
         */

        /*
         * Do not independently advance a Movie Clip that
         * has been externally controlled.
         */
        if (
            this._graphicControlled === true
        ) {
            this._tickChildren();
            return;
        }

        /*
         * MOVIE CLIP + SINGLE FRAME
         */
        if (
            this.animationType === 'single'
        ) {

            this.applySingleFramePosition();

        }

        /*
         * MOVIE CLIP + LOOP
         */
        else if (
            this.animationType === 'loop'
        ) {

            this.timeline.advance();

        }

        /*
         * MOVIE CLIP + PLAY ONCE
         */
        else if (
            this.animationType === 'playOnce'
        ) {

            if (!this.playedOnce) {

                if (
                    this.timeline.playheadPosition >=
                    this.timeline.length
                ) {

                    this.timeline.playheadPosition =
                        this.timeline.length;

                    this.playedOnce = true;

                } else {

                    this.timeline.advance();
                }
            }
        }

        this._tickChildren();
    }

    _onDeactivated() {
        super._onDeactivated();

        /*
         * Do not reset the Graphic's selected frame.
         */
    }

    /*
     * ============================================================
     * CHILD PLAYBACK
     * ============================================================
     */

    _tickChildren() {
        if (
            !this.timeline ||
            !this.timeline.activeFrames
        ) {
            return null;
        }

        let childError = null;

        this.timeline.activeFrames.forEach(frame => {

            if (childError) {
                return;
            }

            childError = frame.tick();

        });

        return childError;
    }

    _attachChildClipReferences() {
        if (
            !this.timeline ||
            !this.timeline.activeFrames
        ) {
            return;
        }

        this.timeline.activeFrames.forEach(frame => {

            if (frame.clips) {

                frame.clips.forEach(clip => {

                    if (!clip.identifier) {
                        return;
                    }

                    this[clip.identifier] =
                        clip;

                    clip._attachChildClipReferences();
                });

            }

            if (frame.dynamicTextPaths) {

                frame.dynamicTextPaths.forEach(path => {

                    if (path.identifier) {
                        this[path.identifier] =
                            path;
                    }

                });

            }

        });
    }

    /*
     * ============================================================
     * CLIP TYPE
     * ============================================================
     */

    get clipType() {
        return this._clipType;
    }

    set clipType(clipType) {

        if (
            clipType !== 'movieClip' &&
            clipType !== 'graphic'
        ) {

            console.error(
                'Clip type: ' +
                clipType +
                ' is invalid! Defaulting to Movie Clip.'
            );

            this._clipType = 'movieClip';

            return;
        }

        /*
         * Change only the Clip's type.
         * Do NOT change project.selection here.
         */
        this._clipType = clipType;

        this._playedOnce = false;
        this._graphicControlled = false;

        /*
         * Preserve the selected Frame Picker frame.
         */
        if (
            this.timeline &&
            this.timeline.length > 0
        ) {

            if (
                this.animationType === 'single'
            ) {

                this.applySingleFramePosition();

            } else {

                this.timeline.playheadPosition = 1;

            }
        }
    }
};