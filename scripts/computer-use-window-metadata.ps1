param([Parameter(Mandatory=$true)][int]$TargetProcessId)
$ErrorActionPreference='Stop'
# Read-only OS provenance. No UI Automation, SendInput, focus, launch, or window mutation.
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class ComputerWindowMetadata {
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback,IntPtr p);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h,uint cmd);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr h);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect r);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int attribute,out Rect r,int size);
  [StructLayout(LayoutKind.Sequential)] public struct Rect {public int left,top,right,bottom;}
  public class Row {public long id,owner; public string title,windowClass; public bool visible,foreground; public int x,y,width,height;public uint dpi;}
  public static object Read(int target) {
    var rows=new List<Row>();var foreground=GetForegroundWindow();uint foregroundPid;GetWindowThreadProcessId(foreground,out foregroundPid);
    EnumWindows((h,p)=>{uint pid;GetWindowThreadProcessId(h,out pid);if(pid!=(uint)target)return true;
      var title=new StringBuilder(1024);var cls=new StringBuilder(256);GetWindowText(h,title,1024);GetClassName(h,cls,256);Rect rect;
      if(DwmGetWindowAttribute(h,9,out rect,16)!=0)GetWindowRect(h,out rect);
      rows.Add(new Row{id=h.ToInt64(),owner=GetWindow(h,4).ToInt64(),title=title.ToString(),windowClass=cls.ToString(),visible=IsWindowVisible(h),foreground=h==foreground,x=rect.left,y=rect.top,width=rect.right-rect.left,height=rect.bottom-rect.top,dpi=GetDpiForWindow(h)});return true;},IntPtr.Zero);
    return new {windows=rows,foreignForeground=foregroundPid!=(uint)target};
  }
}
'@
$target=Get-Process -Id $TargetProcessId
$metadata=[ComputerWindowMetadata]::Read($TargetProcessId)
@{at=[DateTime]::UtcNow.ToString('o');process=@{id=$target.Id;executable=$target.Path;startedAt=$target.StartTime.ToUniversalTime().ToString('o')};windows=$metadata.windows;foreignForeground=$metadata.foreignForeground} | ConvertTo-Json -Depth 6 -Compress
