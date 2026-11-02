# OS-level input and screenshots for scripts/windows/browser-check.mjs.
# Keys go through SendInput as hardware scan codes, so the active keyboard
# layout (and IME) translates them exactly as it does for a physical keyboard.
#
#   os-input.ps1 move <x> <y>
#   os-input.ps1 click <x> <y>
#   os-input.ps1 keys "up,down,enter,esc,backspace,tab,text:abc,altgr+q,shift+2,vk:0x16"
#   os-input.ps1 layout <KLID or HKL hex>   e.g. 00000407 (German), 04110411 (Japanese)
#   os-input.ps1 screenshot <out.png>
#   os-input.ps1 focus <pid>
param([Parameter(Position = 0)][string]$Action, [Parameter(Position = 1)][string]$A1, [Parameter(Position = 2)][string]$A2)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OsInput {
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] public struct UNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public UNION u; }
  [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern IntPtr LoadKeyboardLayout(string id, uint flags);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr GetKeyboardLayout(uint thread);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();

  static void Send(INPUT i) {
    INPUT[] a = new INPUT[] { i };
    if (SendInput(1, a, Marshal.SizeOf(typeof(INPUT))) != 1) throw new Exception("SendInput failed: " + Marshal.GetLastWin32Error());
  }
  public static void Scan(ushort scan, bool extended, bool up) {
    INPUT i = new INPUT(); i.type = 1;
    i.u.ki.wScan = scan;
    i.u.ki.dwFlags = 0x0008u | (extended ? 0x0001u : 0u) | (up ? 0x0002u : 0u);
    Send(i);
  }
  public static void Vk(ushort vk, bool up) {
    INPUT i = new INPUT(); i.type = 1;
    i.u.ki.wVk = vk;
    i.u.ki.dwFlags = up ? 0x0002u : 0u;
    Send(i);
  }
  public static void Click(int x, int y) {
    SetCursorPos(x, y);
    System.Threading.Thread.Sleep(80);
    INPUT down = new INPUT(); down.type = 0; down.u.mi.dwFlags = 0x0002; Send(down);
    System.Threading.Thread.Sleep(40);
    INPUT up = new INPUT(); up.type = 0; up.u.mi.dwFlags = 0x0004; Send(up);
  }
  public static string Layout() {
    uint pid; uint tid = GetWindowThreadProcessId(GetForegroundWindow(), out pid);
    return GetKeyboardLayout(tid).ToInt64().ToString("X8");
  }
}
"@
[void][OsInput]::SetProcessDPIAware()

# US-position scan codes. Extended keys carry an E0 prefix.
$scan = @{
  esc = 0x01; "1" = 0x02; "2" = 0x03; "3" = 0x04; "4" = 0x05; "5" = 0x06; "6" = 0x07; "7" = 0x08; "8" = 0x09; "9" = 0x0A; "0" = 0x0B; minus = 0x0C; equal = 0x0D
  backspace = 0x0E; tab = 0x0F; q = 0x10; w = 0x11; e = 0x12; r = 0x13; t = 0x14; y = 0x15; u = 0x16; i = 0x17; o = 0x18; p = 0x19; lbracket = 0x1A; rbracket = 0x1B
  enter = 0x1C; ctrl = 0x1D; a = 0x1E; s = 0x1F; d = 0x20; f = 0x21; g = 0x22; h = 0x23; j = 0x24; k = 0x25; l = 0x26; semicolon = 0x27; quote = 0x28; backtick = 0x29
  shift = 0x2A; backslash = 0x2B; z = 0x2C; x = 0x2D; c = 0x2E; v = 0x2F; b = 0x30; n = 0x31; m = 0x32; comma = 0x33; period = 0x34; slash = 0x35; alt = 0x38; space = 0x39
}
$extended = @{ up = 0x48; down = 0x50; left = 0x4B; right = 0x4D; altgr = 0x38; rctrl = 0x1D; home = 0x47; end = 0x4F; delete = 0x53 }

function Press([string]$name, [bool]$up) {
  if ($extended.ContainsKey($name)) { [OsInput]::Scan([uint16]$extended[$name], $true, $up) }
  elseif ($scan.ContainsKey($name)) { [OsInput]::Scan([uint16]$scan[$name], $false, $up) }
  else { throw "unknown key: $name" }
}

function Chord([string]$token) {
  $parts = $token.Split("+")
  foreach ($p in $parts) { Press $p $false; Start-Sleep -Milliseconds 20 }
  [array]::Reverse($parts)
  foreach ($p in $parts) { Press $p $true; Start-Sleep -Milliseconds 20 }
}

switch ($Action) {
  "move" { [void][OsInput]::SetCursorPos([int]$A1, [int]$A2) }
  "click" { [OsInput]::Click([int]$A1, [int]$A2) }
  "keys" {
    foreach ($token in $A1.Split(",")) {
      if ($token.StartsWith("text:")) {
        foreach ($ch in $token.Substring(5).ToCharArray()) { Chord ([string]$ch); Start-Sleep -Milliseconds 60 }
      } elseif ($token.StartsWith("vk:")) {
        $vk = [Convert]::ToUInt16($token.Substring(3), 16)
        [OsInput]::Vk($vk, $false); Start-Sleep -Milliseconds 20; [OsInput]::Vk($vk, $true)
      } else { Chord $token }
      Start-Sleep -Milliseconds 120
    }
  }
  "layout" {
    $fg = [OsInput]::GetForegroundWindow()
    if ($A1.Length -eq 8 -and $A1.StartsWith("0000")) {
      $hkl = [OsInput]::LoadKeyboardLayout($A1, 1)
    } else {
      $hkl = [IntPtr][Convert]::ToInt64($A1, 16)
    }
    # WM_INPUTLANGCHANGEREQUEST to the foreground window switches its thread's layout.
    [void][OsInput]::PostMessage($fg, 0x0050, [IntPtr]::Zero, $hkl)
    Start-Sleep -Milliseconds 500
    Write-Output ([OsInput]::Layout())
  }
  "current-layout" { Write-Output ([OsInput]::Layout()) }
  "focus" {
    $p = Get-Process -Id ([int]$A1)
    $h = $p.MainWindowHandle
    if ($h -eq [IntPtr]::Zero) { $h = (Get-Process -Name $p.ProcessName | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1).MainWindowHandle }
    [void][OsInput]::ShowWindow($h, 3)
    [void][OsInput]::SetForegroundWindow($h)
  }
  "screenshot" {
    Add-Type -AssemblyName System.Drawing, System.Windows.Forms
    $b = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size)
    $bmp.Save($A1, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Output "$($b.Width)x$($b.Height)"
  }
  default { throw "unknown action: $Action" }
}
