import React from 'react';
import './Dice.css';

export default function Dice({ face, rolling }) {
  return (
    <div className="dice-container">
      <div className={`dice3d ${rolling ? 'rolling' : ''}`} data-face={face || 1}>
        <div className="face front">
          <span className="dot center"></span>
        </div>
        <div className="face back">
          <span className="dot top-left"></span><span className="dot top-right"></span>
          <span className="dot middle-left"></span><span className="dot middle-right"></span>
          <span className="dot bottom-left"></span><span className="dot bottom-right"></span>
        </div>
        <div className="face right">
          <span className="dot top-left"></span><span className="dot center"></span><span className="dot bottom-right"></span>
        </div>
        <div className="face left">
          <span className="dot top-left"></span><span className="dot top-right"></span>
          <span className="dot bottom-left"></span><span className="dot bottom-right"></span>
        </div>
        <div className="face top">
          <span className="dot top-left"></span><span className="dot bottom-right"></span>
        </div>
        <div className="face bottom">
          <span className="dot top-left"></span><span className="dot top-right"></span>
          <span className="dot center"></span>
          <span className="dot bottom-left"></span><span className="dot bottom-right"></span>
        </div>
      </div>
    </div>
  );
}
