/**
 * Stage App - Main router and coordinator
 */

import { StagePage } from './pages/StagePage';
import { ExaminerPage } from './pages/ExaminerPage';
import { OperatorPage } from './pages/OperatorPage';
import { WatchPage } from './pages/WatchPage';

export class StageApp {
  private apiBase: string;
  private mcpUrl: string;
  private currentPage: StagePage | ExaminerPage | OperatorPage | WatchPage | null = null;
  
  constructor(apiBase: string, mcpUrl: string) {
    this.apiBase = apiBase;
    this.mcpUrl = mcpUrl;
  }
  
  start() {
    // Parse route from hash
    this.handleRoute();
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
  }
  
  private handleRoute() {
    const hash = window.location.hash;
    const url = new URL(window.location.href);
    const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    
    // Cleanup previous page
    if (this.currentPage) {
      this.currentPage.destroy();
    }
    
    // Route to appropriate page
    if (hash.startsWith('#/join')) {
      const sessionId = params.get('s');
      const role = params.get('role');
      
      if (!sessionId || !role) {
        alert('Missing session or role parameter');
        window.location.hash = '';
        return;
      }
      
      if (role === 'examiner') {
        this.currentPage = new ExaminerPage(this.apiBase, this.mcpUrl, sessionId);
      } else if (role === 'operator') {
        this.currentPage = new OperatorPage(this.apiBase, sessionId);
      } else if (role === 'watch') {
        this.currentPage = new WatchPage(this.apiBase, sessionId);
      } else {
        alert('Invalid role: ' + role);
        window.location.hash = '';
        return;
      }
    } else {
      // Default: Stage page
      this.currentPage = new StagePage(this.apiBase, this.mcpUrl);
    }
    
    this.currentPage.render();
  }
}
