# 🎯 Drag & Drop API Requests to Workflow

## ✅ What's Fixed

### 1. **Add Node Button Now Works!**
- The "Add API Node" and "Add Delay Node" buttons now properly add nodes to the center of your viewport
- Uses React Flow's `useReactFlow` hook correctly
- Nodes appear in the center of your current view

### 2. **Drag & Drop from Sidebar!**
- You can now **drag any API request** from the sidebar directly onto the workflow canvas
- The request's configuration (method, URL, headers, body) is automatically copied to the workflow node
- Much faster than manually configuring each node!

---

## 🎨 How to Use

### Method 1: Add Node Button (Fixed!)

1. **Click the Workflow button** (⚡) in the left sidebar
2. **Click "+ API Node"** or "+ Delay Node" in the toolbar
3. **Node appears in the center** of your viewport
4. **Click the node** to configure it in the right panel

### Method 2: Drag & Drop (NEW!)

1. **Open the Workflow canvas** (click ⚡ in sidebar)
2. **Keep the sidebar open** (you should see your collections)
3. **Find an API request** in your collections
4. **Click and drag** the request onto the canvas
5. **Drop it** where you want the node
6. **The node is created** with all the request's configuration!

---

## 📋 Step-by-Step: Drag & Drop

### Visual Guide:

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar              │  Workflow Canvas                │
│                       │                                 │
│  Collections          │  [Untitled Workflow]            │
│  ├─ My APIs           │  [+ API Node] [+ Delay Node]    │
│  │  ├─ GET /users ←───┼──→ Drag this here!              │
│  │  ├─ POST /posts    │                                 │
│  │  └─ PUT /user/:id  │     ┌─────────────┐            │
│  │                    │     │ GET /users  │ ← Dropped!  │
│  └─ Auth APIs         │     └─────────────┘            │
│     ├─ POST /login    │                                 │
│     └─ POST /signup   │                                 │
└─────────────────────────────────────────────────────────┘
```

### Detailed Steps:

1. **Navigate to Workflow**
   - Click the Workflow icon (⚡) in the left sidebar
   - The workflow canvas opens

2. **Locate Your API Request**
   - Look at the left sidebar
   - Expand your collections
   - Find the API request you want to add

3. **Drag the Request**
   - **Click and hold** on the request name
   - You'll see a **drag cursor** (⋮⋮ icon appears)
   - **Drag** it over to the canvas area

4. **Drop on Canvas**
   - **Release** the mouse button where you want the node
   - The node is **instantly created** with:
     - ✅ Request name
     - ✅ HTTP method (GET, POST, etc.)
     - ✅ URL
     - ✅ Headers
     - ✅ Body
     - ✅ All configuration

5. **Configure Further (Optional)**
   - Click the node to open the config panel
   - Add data mappings: `{{node1.body.id}}`
   - Add validations
   - Adjust timeout

---

## 🎯 What Gets Copied

When you drag a request to the workflow:

| Request Property | Copied to Node |
|-----------------|----------------|
| Name | ✅ Node name |
| Method | ✅ HTTP method |
| URL | ✅ Request URL |
| Headers | ✅ All headers |
| Query Params | ✅ All params |
| Body | ✅ Request body (JSON) |
| Protocol | ✅ HTTP/WS/Socket.IO |

**Not copied** (you add these in workflow):
- Data mappings (`{{variables}}`)
- Validations
- Retry logic

---

## 💡 Pro Tips

### Tip 1: Quick Workflow Creation
1. Drag 3-4 API requests onto the canvas
2. Connect them with edges
3. Add data mappings
4. Execute!

### Tip 2: Reuse Existing APIs
- Don't recreate requests manually
- Just drag from your existing collections
- All configuration is preserved

### Tip 3: Mix and Match
- Drag API requests from sidebar
- Add delay nodes with the button
- Connect them together
- Create complex workflows fast!

### Tip 4: Visual Feedback
- Look for the **⋮⋮ icon** when hovering over requests
- The cursor changes to **move** when dragging
- The canvas highlights the drop zone

---

## 🐛 Troubleshooting

### "Add Node" button doesn't work
- **Fixed!** The button now works correctly
- Nodes appear in the center of your viewport
- If you still have issues, try refreshing: `Ctrl+Shift+R`

### Can't drag requests
- Make sure you're in **Workflow mode** (⚡ icon active)
- The sidebar must be **visible**
- Try clicking and holding for a moment before dragging

### Node appears in wrong position
- The node appears where you **drop** it
- You can **drag the node** after creation to reposition
- Use the canvas zoom/pan controls to adjust view

### Request data not copied
- Make sure you're dragging an **HTTP request** (not WebSocket)
- The request must have a valid configuration
- Check the node config panel to verify data

---

## 🎨 Visual Indicators

### Draggable Requests
```
┌────────────────────────────┐
│ GET  My API Request    ⋮⋮  │ ← Hover shows drag icon
└────────────────────────────┘
```

### While Dragging
```
Cursor: ↔ (move cursor)
Canvas: Ready to receive drop
```

### After Drop
```
┌─────────────────┐
│ GET My Request  │ ← New node created!
│ https://api...  │
└─────────────────┘
```

---

## 🚀 Example Workflow

### Scenario: User Registration Flow

1. **Drag "POST /register"** from sidebar → Drop on canvas
2. **Drag "POST /login"** from sidebar → Drop below first node
3. **Drag "GET /profile"** from sidebar → Drop below second node
4. **Connect** the nodes (drag from bottom to top)
5. **Add data mapping** in node 2: `{{node1.body.userId}}`
6. **Add data mapping** in node 3: `{{node2.body.token}}`
7. **Click Execute!**

Result: Complete registration → login → fetch profile workflow in under 2 minutes!

---

## ✅ Summary

### What Works Now:
- ✅ **Add Node buttons** work correctly
- ✅ **Drag & drop** from sidebar to canvas
- ✅ **All request data** is copied automatically
- ✅ **Visual feedback** during drag
- ✅ **Fast workflow creation**

### How to Use:
1. Click Workflow icon (⚡)
2. Drag API requests from sidebar
3. Drop on canvas
4. Connect nodes
5. Execute!

---

**Your workflow builder is now fully functional with drag & drop support!** 🎉

Try it now:
1. Open your app
2. Click the Workflow icon (⚡)
3. Drag an API request onto the canvas
4. Watch it create a node instantly!
