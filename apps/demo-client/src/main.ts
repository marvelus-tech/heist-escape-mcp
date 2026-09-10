/**
 * Heist Escape - Stage Mode Entry Point
 * 
 * Routing:
 * / - Stage page (Start Demo button, big screen)
 * /#/join?s=SESSION&role=examiner - Examiner briefing + MCP config
 * /#/join?s=SESSION&role=operator - Operator controls (phone-friendly)
 */

import './stage/theme/tokens.css';
import { StageApp } from './stage/StageApp';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';
const MCP_URL = import.meta.env.VITE_MCP_URL || 'http://localhost:8787/mcp';

console.log('🎯 Heist Escape Stage');
console.log('API Base:', API_BASE);
console.log('MCP URL:', MCP_URL);

// Initialize the app
const app = new StageApp(API_BASE, MCP_URL);
app.start();

// Mark app as loaded
document.body.classList.add('loaded');
