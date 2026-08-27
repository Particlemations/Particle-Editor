/*
 * Copyright I don't know
 */

import React, { Component } from 'react';

import './_inspectorframebutton.scss';

import WickInput from 'Editor/Util/WickInput/WickInput';



class InspectorFrameButton extends Component {
    render() {
        return (
            <WickInput type="button" className={this.props.isActive ? "frameButton frameButton-active" : "frameButton"} onClick={this.props.onClick}>
                <div className="frameButton-image">
                    {this.props.children}
                </div>
                <span className="frameButton-text">{this.props.label}</span>
            </WickInput>
        );
    }
}

export default InspectorFrameButton