# 🎯 Where is the Workflow Button?

## Location: Left Sidebar Activity Bar

The **Workflow** button is located in the **left sidebar** of your app, in the vertical activity bar.

### Visual Guide:

```
┌─────────────────────────────────────────────────────────┐
│  ┌──┐  ┌──────────────────────────────────────────┐    │
│  │  │  │                                          │    │
│  │📁│  │  Main Content Area                       │    │
│  │  │  │                                          │    │
│  ├──┤  │                                          │    │
│  │⚡│  ← WORKFLOW BUTTON (Click here!)            │    │
│  │  │  │                                          │    │
│  ├──┤  │                                          │    │
│  │📊│  │                                          │    │
│  │  │  │                                          │    │
│  ├──┤  │                                          │    │
│  │📖│  │                                          │    │
│  │  │  │                                          │    │
│  └──┘  └──────────────────────────────────────────┘    │
│   ↑                                                     │
│   Activity Bar                                          │
└─────────────────────────────────────────────────────────┘
```

## Step-by-Step Instructions:

### 1. Open Your App
- Your dev server should be running on `http://localhost:5173`
- Open it in your browser

### 2. Look at the Left Side
- You'll see a **narrow vertical bar** on the far left
- This is called the "Activity Bar"

### 3. Find the Workflow Icon
The buttons from top to bottom are:
1. **📁 Collections** (folder icon)
2. **⚡ Workflow** ← **THIS IS IT!** (grid/workflow icon)
3. **📊 Env** (sliders icon)
4. **📖 Docs** (document icon)

### 4. Click the Workflow Button
- Click the **second button** from the top
- It has a **grid/workflow icon** (4 squares)
- The tooltip says "Workflow"

### 5. The Workflow Canvas Opens
- You'll see a full-screen canvas
- Toolbar at the top with "Add Node" buttons
- Empty canvas with grid background

## What the Button Looks Like:

```
┌────┐
│ ▢▢ │  ← Grid icon (4 squares)
│ ▢▢ │
└────┘
```

## If You Don't See It:

### Check 1: Are you in V2 Layout?
- Look for a button in the top-right that says "New UI" or "Classic Layout"
- If you see "Classic Layout", you're already in V2 (correct)
- If you see "New UI", click it to switch to V2 layout

### Check 2: Is the sidebar open?
- Look for a hamburger menu icon (☰) in the top-left
- Click it to toggle the sidebar open

### Check 3: Refresh the page
- Press `Ctrl+R` (Windows) or `Cmd+R` (Mac)
- The button should appear after refresh

## Button Order (Top to Bottom):

1. **Collections** - Folder icon
2. **Workflow** - Grid icon ← **YOU WANT THIS ONE**
3. **Env** - Sliders icon
4. **Docs** - Document icon

---

## Quick Test:

1. Open app → `http://localhost:5173`
2. Login if needed
3. Look at the **far left** vertical bar
4. Click the **second button** (grid icon)
5. You should see the workflow canvas!

---

## Screenshot Locations:

If you want to take a screenshot to verify:
- The button is at approximately **50-80 pixels from the left edge**
- About **100-150 pixels from the top**
- In the vertical activity bar

---

## Still Can't Find It?

The button was just added to:
- File: `apps/desktop/src/components/LayoutV2/SidebarV2.jsx`
- Line: ~18-28 (in the NAV_ITEMS array)
- ID: `'workflow'`
- Label: `'Workflow'`

If you still don't see it, try:
1. **Hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear cache**: Open DevTools (F12) → Right-click refresh → "Empty Cache and Hard Reload"
3. **Restart dev server**: Stop and run `npm run dev` again

---

**The button is there! Look for the grid icon (⚡ or ▢▢) in the left activity bar!**
