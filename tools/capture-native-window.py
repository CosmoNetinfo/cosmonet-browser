"""Capture only the test app's own window, never the full desktop. Needs Pillow."""
import ctypes
from ctypes import wintypes
from pathlib import Path
import sys
from PIL import Image

pid=int(sys.argv[1])
destination=Path(sys.argv[2]).resolve()
root=Path(__file__).resolve().parents[1]/"docs/screenshots"
if destination.parent!=root.resolve(): raise ValueError("Screenshot must stay in docs/screenshots")
user32=ctypes.windll.user32
gdi32=ctypes.windll.gdi32
user32.GetWindowDC.argtypes=[wintypes.HWND];user32.GetWindowDC.restype=wintypes.HDC
user32.ReleaseDC.argtypes=[wintypes.HWND,wintypes.HDC]
user32.PrintWindow.argtypes=[wintypes.HWND,wintypes.HDC,wintypes.UINT]
user32.GetWindowRect.argtypes=[wintypes.HWND,ctypes.POINTER(wintypes.RECT)]
gdi32.CreateCompatibleDC.argtypes=[wintypes.HDC];gdi32.CreateCompatibleDC.restype=wintypes.HDC
gdi32.CreateCompatibleBitmap.argtypes=[wintypes.HDC,ctypes.c_int,ctypes.c_int];gdi32.CreateCompatibleBitmap.restype=wintypes.HBITMAP
gdi32.SelectObject.argtypes=[wintypes.HDC,wintypes.HGDIOBJ];gdi32.SelectObject.restype=wintypes.HGDIOBJ
gdi32.DeleteObject.argtypes=[wintypes.HGDIOBJ];gdi32.DeleteDC.argtypes=[wintypes.HDC]
gdi32.GetDIBits.argtypes=[wintypes.HDC,wintypes.HBITMAP,wintypes.UINT,wintypes.UINT,ctypes.c_void_p,ctypes.c_void_p,wintypes.UINT]
found=[]
callback_type=ctypes.WINFUNCTYPE(wintypes.BOOL,wintypes.HWND,wintypes.LPARAM)
@callback_type
def visit(hwnd,extra):
    owner=wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd,ctypes.byref(owner))
    if owner.value==pid and user32.IsWindowVisible(hwnd):
        text=ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd,text,256)
        if "Cosmo Browser" in text.value: found.append(hwnd)
    return True
user32.EnumWindows(visit,0)
if not found: raise RuntimeError("The test browser window was not found")
hwnd=found[0]
try:
    rect=wintypes.RECT()
    if not user32.GetWindowRect(hwnd,ctypes.byref(rect)): raise RuntimeError("Cannot read app window dimensions")
    width,height=rect.right-rect.left,rect.bottom-rect.top
    source=user32.GetWindowDC(hwnd)
    memory=gdi32.CreateCompatibleDC(source)
    bitmap=gdi32.CreateCompatibleBitmap(source,width,height)
    previous=gdi32.SelectObject(memory,bitmap)
    class Header(ctypes.Structure):
        _fields_=[("size",wintypes.DWORD),("width",wintypes.LONG),("height",wintypes.LONG),("planes",wintypes.WORD),("bits",wintypes.WORD),("compression",wintypes.DWORD),("imageSize",wintypes.DWORD),("xppm",wintypes.LONG),("yppm",wintypes.LONG),("colors",wintypes.DWORD),("important",wintypes.DWORD)]
    try:
        # Ask the owned window to render directly into a blank offscreen bitmap.
        # There is deliberately no screen-DC read, BitBlt or desktop fallback.
        if not user32.PrintWindow(hwnd,memory,2): raise RuntimeError("App window did not render; refusing desktop capture")
        header=Header(ctypes.sizeof(Header),width,-height,1,32,0,0,0,0,0,0)
        pixels=ctypes.create_string_buffer(width*height*4)
        if gdi32.GetDIBits(memory,bitmap,0,height,pixels,ctypes.byref(header),0)!=height: raise RuntimeError("Cannot read app bitmap")
        image=Image.frombytes("RGB",(width,height),pixels.raw,"raw","BGRX")
    finally:
        gdi32.SelectObject(memory,previous);gdi32.DeleteObject(bitmap);gdi32.DeleteDC(memory);user32.ReleaseDC(hwnd,source)
    destination.parent.mkdir(parents=True,exist_ok=True)
    image.save(destination)
    print(f"Captured only the Cosmo Browser window: {destination.name}, {image.width}x{image.height}")
finally:
    user32.PostMessageW(hwnd,0x0010,0,0)
