import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemoSession } from '../hooks/DemoContext.jsx';
import { DEMO_USERS } from '../mocks/fixtures.js';
import { resetDemoData } from '../services/scopePilotService.js';
import styles from './TopArchNav.module.css';

/**
 * TopArchNav:
 * The cyber-geometric semicircle navigation hub anchored at the top-center of the screen.
 * 
 * Features:
 * - Constant coordinate scale: Circles 1 & 2 maintain exact identical physical size across both 2-circle and 4-circle modes.
 * - Semicircle boundary is pure pitch black (#000000, no outline), blending into background.
 * - Dedicated annular sector clickboxes matching user drawing:
 *   - Profile sector (Circle 1)
 *   - Workplace sector (left annular ring)
 *   - Projects sector (right annular ring)
 *   - Overview, Approved Scope, Milestones, Change Reqs sectors (outer annular segments)
 * - Approved scope divider line bug fixed (uses userSpaceOnUse filter so strictly vertical 90° line never collapses/disappears).
 * - Paired circles: Pair (1, 2) and Pair (3, 4).
 * - Curved text on the OUTSIDE of each outline.
 * - Floating diamond at bottom with NO middle line.
 */
export default function TopArchNav({ projectTabs, activeProjectTab = 'overview', onSelectProjectTab }) {
  const { session, switchRole, logout } = useDemoSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredSection, setHoveredSection] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const isWorkspace = location.pathname.startsWith('/workspace');
  const isProjects = location.pathname.startsWith('/projects');

  const isWorkplaceHovered = hoveredSection === 'workplace';
  const isProjectsHovered = hoveredSection === 'projects';
  const isOverviewHovered = hoveredSection === 'overview';
  const isScopeHovered = hoveredSection === 'scope';
  const isMilestonesHovered = hoveredSection === 'milestones';
  const isChangesHovered = hoveredSection === 'changes';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleReset() {
    if (window.confirm('Reset all demo data? This restores the original sample state.')) {
      resetDemoData();
      window.location.reload();
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  function handleOuterTabClick(tabId) {
    if (onSelectProjectTab) {
      onSelectProjectTab(tabId);
    } else {
      navigate('/projects/proj-001');
      setTimeout(() => onSelectProjectTab?.(tabId), 50);
    }
  }

  // Constant ViewBox 0 0 800 300 with xMidYMin slice guarantees Circles 1 & 2 are 100% static across all screens
  const svgViewBox = "0 0 800 300";
  const archHeightClass = projectTabs ? styles.archContainerProject : styles.archContainerWorkspace;

  return (
    <>
      {/* Discrete floating demo reset in corner (takes 0 screen height) */}
      <div className={styles.cornerFloatingControls}>
        <span className={styles.cornerBrand}>SCOPEPILOT</span>
        <button
          type="button"
          className={styles.discreteResetBtn}
          onClick={handleReset}
          title="Reset demo data"
        >
          [ ↺ Reset ]
        </button>
      </div>

      {/* Semicircle Navigation Arch (Anchored at top center, NO horizontal bar) */}
      <header className={styles.archNavFloating}>
        <div className={`${styles.archContainer} ${archHeightClass}`}>
          <svg
            className={styles.archSvg}
            viewBox={svgViewBox}
            preserveAspectRatio="xMidYMin slice"
          >
            <defs>
              {/* userSpaceOnUse ensures filter region NEVER collapses on vertical or 0-width elements */}
              <filter id="purpleGlow" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="310">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#d8b4fe" floodOpacity="0.95" />
              </filter>

              {/* ── Guide Tracks for Curved Text (on the OUTSIDE of each circle) ── */}
              {/* Circle 2: Text path on the OUTSIDE (R=180, while outline is R=155) */}
              <path
                id="textpath-workplace"
                d="M 220.7 15.7 A 180 180 0 0,0 384.3 179.3"
              />
              <path
                id="textpath-projects"
                d="M 415.7 179.3 A 180 180 0 0,0 579.3 15.7"
              />

              {/* Circle 4: Text path on the OUTSIDE (R=280, while outline is R=255) */}
              {projectTabs && (
                <>
                  <path
                    id="textpath-overview"
                    d="M 120.7 19.5 A 280 280 0 0,0 191.9 187.3"
                  />
                  <path
                    id="textpath-scope"
                    d="M 205.5 201.4 A 280 280 0 0,0 380.5 279.3"
                  />
                  <path
                    id="textpath-milestones"
                    d="M 419.5 279.3 A 280 280 0 0,0 594.5 201.4"
                  />
                  <path
                    id="textpath-changes"
                    d="M 608.1 187.3 A 280 280 0 0,0 679.3 19.5"
                  />
                </>
              )}
            </defs>

            {/* ═══════════════════════════════════════════════════════════════
                SEMICIRCLE BACKGROUND BOUNDARY (Turned ALL BLACK, no visible boundary)
                ═══════════════════════════════════════════════════════════════ */}
            {/* Base semicircle (R=200) for inner wheel: always present and 100% static */}
            <path
              d="M 200 0 A 200 200 0 0,0 600 0 Z"
              fill="#000000"
              stroke="none"
            />

            {/* ═══════════════════════════════════════════════════════════════
                CIRCLE 1: Innermost Semicircle (R=115) – Profile Area
                NO straight line at the top. Generous breathing room inside.
                ═══════════════════════════════════════════════════════════════ */}
            <path
              d="M 285 0 A 115 115 0 0,0 515 0"
              fill="#0d0d14"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* ═══════════════════════════════════════════════════════════════
                CIRCLE 2: Pair (1,2) – Close to Circle 1 (R=155)
                Divided in Two: Workplace (left) & Projects (right)
                Dividing diamond at bottom with NO line through the middle
                ═══════════════════════════════════════════════════════════════ */}
            {/* Left Arc: Workplace */}
            <path
              d="M 245.1 5.4 A 155 155 0 0,0 383.8 154.1"
              fill="none"
              stroke={isWorkspace || isWorkplaceHovered ? 'var(--purple-vivid)' : '#ffffff'}
              strokeWidth={isWorkspace || isWorkplaceHovered ? '3.5' : '2'}
              filter={isWorkspace || isWorkplaceHovered ? 'url(#purpleGlow)' : undefined}
            />

            {/* Right Arc: Projects */}
            <path
              d="M 416.2 154.1 A 155 155 0 0,0 554.9 5.4"
              fill="none"
              stroke={isProjects || isProjectsHovered ? 'var(--purple-vivid)' : '#ffffff'}
              strokeWidth={isProjects || isProjectsHovered ? '3.5' : '2'}
              filter={isProjects || isProjectsHovered ? 'url(#purpleGlow)' : undefined}
            />

            {/* Circle 2 Curved Text on the OUTSIDE (R=180) */}
            <text
              className={`${styles.curvedText} ${isWorkspace ? styles.curvedTextActive : ''} ${isWorkplaceHovered ? styles.curvedTextHover : ''}`}
            >
              <textPath href="#textpath-workplace" startOffset="50%" textAnchor="middle">
                Workplace
              </textPath>
            </text>

            <text
              className={`${styles.curvedText} ${isProjects ? styles.curvedTextActive : ''} ${isProjectsHovered ? styles.curvedTextHover : ''}`}
            >
              <textPath href="#textpath-projects" startOffset="50%" textAnchor="middle">
                Projects
              </textPath>
            </text>

            {/* Dividing Diamond at (400, 155) – Pure solid white with NO middle line */}
            <polygon
              points="400,143 407,155 400,167 393,155"
              fill="#ffffff"
            />
            {/* Left chevron outline */}
            <polyline
              points="400,143 393,155 400,167"
              fill="none"
              stroke={isWorkspace || isWorkplaceHovered ? 'var(--purple-vivid)' : '#ffffff'}
              strokeWidth={isWorkspace || isWorkplaceHovered ? '2.5' : '1.5'}
              filter={isWorkspace || isWorkplaceHovered ? 'url(#purpleGlow)' : undefined}
            />
            {/* Right chevron outline */}
            <polyline
              points="400,143 407,155 400,167"
              fill="none"
              stroke={isProjects || isProjectsHovered ? 'var(--purple-vivid)' : '#ffffff'}
              strokeWidth={isProjects || isProjectsHovered ? '2.5' : '1.5'}
              filter={isProjects || isProjectsHovered ? 'url(#purpleGlow)' : undefined}
            />

            {/* ═══════════════════════════════════════════════════════════════
                CIRCLES 3 & 4: Pair (3,4) – ONLY render when project is selected!
                Emerge outward smoothly while Circles 1 & 2 remain 100% static!
                ═══════════════════════════════════════════════════════════════ */}
            {projectTabs && (
              <g className={styles.outerCirclesGroup}>
                {/* Outer black annular background (R=200 to R=300) expands with Circles 3 & 4 */}
                <path
                  d="M 100 0 A 300 300 0 0,0 700 0 L 600 0 A 200 200 0 0,1 200 0 Z"
                  fill="#000000"
                  stroke="none"
                />

                {/* CIRCLE 3: Unbroken Concentric Semicircle (R=215), NO top line */}
                <path
                  d="M 185 0 A 215 215 0 0,0 615 0"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* CIRCLE 4: Outermost Semicircle (R=255), close to Circle 3 */}
                {/* Section 1: Overview */}
                <path
                  d="M 145.6 17.8 A 255 255 0 0,0 199.1 157.0"
                  fill="none"
                  stroke={activeProjectTab === 'overview' || isOverviewHovered ? 'var(--purple-vivid)' : '#ffffff'}
                  strokeWidth={activeProjectTab === 'overview' || isOverviewHovered ? '3.5' : '2'}
                  filter={activeProjectTab === 'overview' || isOverviewHovered ? 'url(#purpleGlow)' : undefined}
                />
                <text
                  className={`${styles.curvedTextOuter} ${activeProjectTab === 'overview' ? styles.curvedTextActive : ''} ${isOverviewHovered ? styles.curvedTextHover : ''}`}
                >
                  <textPath href="#textpath-overview" startOffset="50%" textAnchor="middle">
                    Overview
                  </textPath>
                </text>

                {/* Disconnected Radial Divider Line 1 (at 135°) */}
                {/* Turns pastel purple if Overview is selected or hovered */}
                <line
                  x1="230.3" y1="169.7"
                  x2="209.1" y2="190.9"
                  stroke={activeProjectTab === 'overview' || isOverviewHovered ? 'var(--purple-vivid)' : '#ffffff'}
                  strokeWidth={activeProjectTab === 'overview' || isOverviewHovered ? '3.5' : '2'}
                  filter={activeProjectTab === 'overview' || isOverviewHovered ? 'url(#purpleGlow)' : undefined}
                  strokeLinecap="round"
                />

                {/* Section 2: Approved Scope */}
                <path
                  d="M 243.0 200.9 A 255 255 0 0,0 368.9 253.1"
                  fill="none"
                  stroke={activeProjectTab === 'scope' || isScopeHovered ? 'var(--purple-vivid)' : '#ffffff'}
                  strokeWidth={activeProjectTab === 'scope' || isScopeHovered ? '3.5' : '2'}
                  filter={activeProjectTab === 'scope' || isScopeHovered ? 'url(#purpleGlow)' : undefined}
                />
                <text
                  className={`${styles.curvedTextOuter} ${activeProjectTab === 'scope' ? styles.curvedTextActive : ''} ${isScopeHovered ? styles.curvedTextHover : ''}`}
                >
                  <textPath href="#textpath-scope" startOffset="50%" textAnchor="middle">
                    Approved scope
                  </textPath>
                </text>

                {/* Disconnected Radial Divider Line 2 (at 90°) */}
                {/* Turns pastel purple if Approved Scope is selected or hovered */}
                <line
                  x1="400" y1="240"
                  x2="400" y2="270"
                  stroke={activeProjectTab === 'scope' || isScopeHovered ? 'var(--purple-vivid)' : '#ffffff'}
                  strokeWidth={activeProjectTab === 'scope' || isScopeHovered ? '3.5' : '2'}
                  filter={activeProjectTab === 'scope' || isScopeHovered ? 'url(#purpleGlow)' : undefined}
                  strokeLinecap="round"
                />

                {/* Section 3: Milestones */}
                <path
                  d="M 431.1 253.1 A 255 255 0 0,0 557.0 200.9"
                  fill="none"
                  stroke={activeProjectTab === 'milestones' || isMilestonesHovered ? 'var(--purple-vivid)' : '#ffffff'}
                  strokeWidth={activeProjectTab === 'milestones' || isMilestonesHovered ? '3.5' : '2'}
                  filter={activeProjectTab === 'milestones' || isMilestonesHovered ? 'url(#purpleGlow)' : undefined}
                />
                <text
                  className={`${styles.curvedTextOuter} ${activeProjectTab === 'milestones' ? styles.curvedTextActive : ''} ${isMilestonesHovered ? styles.curvedTextHover : ''}`}
                >
                  <textPath href="#textpath-milestones" startOffset="50%" textAnchor="middle">
                    Milestones
                  </textPath>
                </text>

                {/* Disconnected Radial Divider Line 3 (at 45°) */}
                {/* Turns pastel purple if Milestones is selected or hovered */}
                <line
                  x1="569.7" y1="169.7"
                  x2="590.9" y2="190.9"
                  stroke={activeProjectTab === 'milestones' || isMilestonesHovered ? 'var(--purple-vivid)' : '#ffffff'}
                  strokeWidth={activeProjectTab === 'milestones' || isMilestonesHovered ? '3.5' : '2'}
                  filter={activeProjectTab === 'milestones' || isMilestonesHovered ? 'url(#purpleGlow)' : undefined}
                  strokeLinecap="round"
                />

                {/* Section 4: Change Requests */}
                <path
                  d="M 600.9 157.0 A 255 255 0 0,0 654.4 17.8"
                  fill="none"
                  stroke={activeProjectTab === 'changes' || isChangesHovered ? 'var(--purple-vivid)' : '#ffffff'}
                  strokeWidth={activeProjectTab === 'changes' || isChangesHovered ? '3.5' : '2'}
                  filter={activeProjectTab === 'changes' || isChangesHovered ? 'url(#purpleGlow)' : undefined}
                />
                <text
                  className={`${styles.curvedTextOuter} ${activeProjectTab === 'changes' ? styles.curvedTextActive : ''} ${isChangesHovered ? styles.curvedTextHover : ''}`}
                >
                  <textPath href="#textpath-changes" startOffset="50%" textAnchor="middle">
                    Change reqs
                  </textPath>
                </text>
              </g>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                DEDICATED ANNULAR SECTOR CLICKBOXES (Matching user drawing)
                Annular regions for Workplace, Projects, and outer project tabs.
                Profile clickbox is strictly isolated to the profile name & triangle below.
                ═══════════════════════════════════════════════════════════════ */}

            {/* 1. Workplace Sector: Left annular sector between R=115 and outer boundary */}
            <path
              d={projectTabs
                ? "M 285 0 L 185 0 A 215 215 0 0,0 400 215 L 400 115 A 115 115 0 0,1 285 0 Z"
                : "M 285 0 L 200 0 A 200 200 0 0,0 400 200 L 400 115 A 115 115 0 0,1 285 0 Z"
              }
              fill="transparent"
              className={styles.sectorClickTarget}
              onMouseEnter={() => setHoveredSection('workplace')}
              onMouseLeave={() => setHoveredSection((prev) => (prev === 'workplace' ? null : prev))}
              onClick={() => navigate('/workspace')}
              aria-label="Navigate to Workplace"
            />

            {/* 2. Projects Sector: Right annular sector between R=115 and outer boundary */}
            <path
              d={projectTabs
                ? "M 400 115 L 400 215 A 215 215 0 0,0 615 0 L 515 0 A 115 115 0 0,1 400 115 Z"
                : "M 400 115 L 400 200 A 200 200 0 0,0 600 0 L 515 0 A 115 115 0 0,1 400 115 Z"
              }
              fill="transparent"
              className={styles.sectorClickTarget}
              onMouseEnter={() => setHoveredSection('projects')}
              onMouseLeave={() => setHoveredSection((prev) => (prev === 'projects' ? null : prev))}
              onClick={() => navigate('/projects')}
              aria-label="Navigate to Projects"
            />

            {/* 3. Outer Tab Sectors (Only when projectTabs is true, between R=215 and R=300) */}
            {projectTabs && (
              <g className={styles.outerCirclesGroup}>
                {/* Overview Sector: from 180° to 135° */}
                <path
                  d="M 185 0 L 100 0 A 300 300 0 0,0 187.9 212.1 L 248.0 152.0 A 215 215 0 0,1 185 0 Z"
                  fill="transparent"
                  className={styles.sectorClickTarget}
                  onMouseEnter={() => setHoveredSection('overview')}
                  onMouseLeave={() => setHoveredSection((prev) => (prev === 'overview' ? null : prev))}
                  onClick={() => handleOuterTabClick('overview')}
                  aria-label="Switch to Overview"
                />

                {/* Approved Scope Sector: from 135° to 90° */}
                <path
                  d="M 248.0 152.0 L 187.9 212.1 A 300 300 0 0,0 400 300 L 400 215 A 215 215 0 0,1 248.0 152.0 Z"
                  fill="transparent"
                  className={styles.sectorClickTarget}
                  onMouseEnter={() => setHoveredSection('scope')}
                  onMouseLeave={() => setHoveredSection((prev) => (prev === 'scope' ? null : prev))}
                  onClick={() => handleOuterTabClick('scope')}
                  aria-label="Switch to Approved scope"
                />

                {/* Milestones Sector: from 90° to 45° */}
                <path
                  d="M 400 215 L 400 300 A 300 300 0 0,0 612.1 212.1 L 552.0 152.0 A 215 215 0 0,1 400 215 Z"
                  fill="transparent"
                  className={styles.sectorClickTarget}
                  onMouseEnter={() => setHoveredSection('milestones')}
                  onMouseLeave={() => setHoveredSection((prev) => (prev === 'milestones' ? null : prev))}
                  onClick={() => handleOuterTabClick('milestones')}
                  aria-label="Switch to Milestones"
                />

                {/* Change Requests Sector: from 45° to 0° */}
                <path
                  d="M 552.0 152.0 L 612.1 212.1 A 300 300 0 0,0 700 0 L 615 0 A 215 215 0 0,1 552.0 152.0 Z"
                  fill="transparent"
                  className={styles.sectorClickTarget}
                  onMouseEnter={() => setHoveredSection('changes')}
                  onMouseLeave={() => setHoveredSection((prev) => (prev === 'changes' ? null : prev))}
                  onClick={() => handleOuterTabClick('changes')}
                  aria-label="Switch to Change requests"
                />
              </g>
            )}
          </svg>

          {/* ── Inner Profile Dropdown Trigger (Centered inside Circle 1) ── */}
          <div className={styles.profileCore} ref={dropdownRef}>
            <button
              type="button"
              className={styles.profileBtn}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-label="Profile options"
            >
              <span className={styles.profileName}>{session?.name ?? 'Taran Thalla'}</span>
              <svg width="22" height="7" viewBox="0 0 22 7" className={styles.triangleSvgIcon}>
                <polygon points="0,0 22,0 11,7" fill="var(--purple-vivid)" />
              </svg>
            </button>

            {/* Reverse Animated Dropdown */}
            {dropdownOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.dropdownHeader}>
                  <span className={styles.dropdownUserRole}>[ {session?.role ?? 'freelancer'} ]</span>
                </div>
                <div className={styles.rolePickerList}>
                  <span className={styles.rolePickerTitle}>Switch Persona:</span>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`${styles.dropdownOption} ${session?.id === u.id ? styles.dropdownOptionActive : ''}`}
                      onClick={() => {
                        switchRole(u.id);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{u.name}</span>
                      <span className={styles.dropdownOptionTag}>[{u.role}]</span>
                    </button>
                  ))}
                </div>
                <div className={styles.dropdownDivider} />
                <button type="button" className={styles.dropdownResetBtn} onClick={handleReset}>
                  ↺ Reset Demo Data
                </button>
                <div className={styles.dropdownDivider} />
                <button type="button" className={styles.dropdownLogout} onClick={handleLogout}>
                  Log out ◊
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
