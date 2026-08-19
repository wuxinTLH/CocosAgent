using System.Diagnostics;
using System.Runtime.InteropServices;

const string usage = "Usage: CocosAgentOverlay.exe <cocos-project-root> | -ProjectRoot <cocos-project-root> [--repo <agent-root>] [--creator <CocosCreator.exe>] [--dry-run]";

var project = string.Empty;
var repo = AppContext.BaseDirectory;
var creator = string.Empty;
var dryRun = false;
var output = new List<string>();

static void ShowError(string text)
{
    Console.Error.WriteLine(text);
    NativeMethods.MessageBoxW(0, text, "Cocos Agent Overlay", 0x10);
}

for (var index = 0; index < args.Length; index++)
{
    var arg = args[index];
    if (arg is "-h" or "--help")
    {
        Console.WriteLine(usage);
        return 0;
    }
    if (arg is "--project" or "--project-root" or "-ProjectRoot")
    {
        if (index + 1 >= args.Length)
        {
            ShowError($"Missing project path.\n\n{usage}");
            return 2;
        }
        project = Path.GetFullPath(args[++index]);
        continue;
    }
    if (arg == "--repo" && index + 1 < args.Length)
    {
        repo = Path.GetFullPath(args[++index]);
        continue;
    }
    if (arg == "--creator" && index + 1 < args.Length)
    {
        creator = Path.GetFullPath(args[++index]);
        continue;
    }
    if (arg == "--dry-run")
    {
        dryRun = true;
        continue;
    }
    if (arg.StartsWith('-'))
    {
        ShowError($"Unknown argument: {arg}\n\n{usage}");
        return 2;
    }
    if (string.IsNullOrWhiteSpace(project))
    {
        project = Path.GetFullPath(arg);
    }
}

if (string.IsNullOrWhiteSpace(project))
{
    ShowError(usage);
    return 2;
}

var script = Path.Combine(repo, "scripts", "launch-cocos-agent.ps1");
if (!File.Exists(script))
{
    ShowError($"Launcher script not found:\n{script}\n\nUse --repo to point at an unpacked Cocos Agent release.");
    return 3;
}

var powershell = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.Windows),
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe");
using var process = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = powershell,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true,
    },
};
process.StartInfo.ArgumentList.Add("-NoProfile");
process.StartInfo.ArgumentList.Add("-ExecutionPolicy");
process.StartInfo.ArgumentList.Add("Bypass");
process.StartInfo.ArgumentList.Add("-File");
process.StartInfo.ArgumentList.Add(script);
process.StartInfo.ArgumentList.Add("-ProjectRoot");
process.StartInfo.ArgumentList.Add(project);
process.StartInfo.ArgumentList.Add("-SkipBuild");
if (!string.IsNullOrWhiteSpace(creator))
{
    process.StartInfo.ArgumentList.Add("-CreatorPath");
    process.StartInfo.ArgumentList.Add(creator);
}
if (dryRun) process.StartInfo.ArgumentList.Add("-DryRun");
process.OutputDataReceived += (_, eventArgs) =>
{
    if (eventArgs.Data is null) return;
    output.Add(eventArgs.Data);
    Console.WriteLine(eventArgs.Data);
};
process.ErrorDataReceived += (_, eventArgs) =>
{
    if (eventArgs.Data is null) return;
    output.Add(eventArgs.Data);
    Console.Error.WriteLine(eventArgs.Data);
};
try
{
    process.Start();
}
catch (Exception error)
{
    ShowError($"Unable to start PowerShell.\n\n{error.Message}");
    return 4;
}
process.BeginOutputReadLine();
process.BeginErrorReadLine();
process.WaitForExit();
if (process.ExitCode != 0 && !dryRun)
{
    var detail = output.Count == 0 ? "No diagnostic output was produced." : string.Join(Environment.NewLine, output.TakeLast(12));
    ShowError($"Cocos Agent Overlay could not open.\n\n{detail}\n\nLog: %USERPROFILE%\\.cocos-agent\\launcher.log");
}
return process.ExitCode;

internal static partial class NativeMethods
{
    [LibraryImport("user32.dll", StringMarshalling = StringMarshalling.Utf16)]
    internal static partial int MessageBoxW(nint hWnd, string text, string caption, uint type);
}
