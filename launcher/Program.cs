using System.Diagnostics;

const string usage = "Usage: CocosAgentOverlay.exe <cocos-project-root> [--repo <agent-root>] [--creator <CocosCreator.exe>] [--dry-run]";

var project = string.Empty;
var repo = AppContext.BaseDirectory;
var creator = string.Empty;
var dryRun = false;

for (var index = 0; index < args.Length; index++)
{
    var arg = args[index];
    if (arg is "-h" or "--help")
    {
        Console.WriteLine(usage);
        return 0;
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
    if (string.IsNullOrWhiteSpace(project))
    {
        project = Path.GetFullPath(arg);
    }
}

if (string.IsNullOrWhiteSpace(project))
{
    Console.Error.WriteLine(usage);
    return 2;
}

var script = Path.Combine(repo, "scripts", "launch-cocos-agent.ps1");
if (!File.Exists(script))
{
    Console.Error.WriteLine($"Launcher script not found: {script}");
    return 3;
}

var powershell = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.Windows),
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe");
var arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{script}\" -ProjectRoot \"{project}\" -SkipBuild";
if (!string.IsNullOrWhiteSpace(creator)) arguments += $" -CreatorPath \"{creator}\"";
if (dryRun) arguments += " -DryRun";

using var process = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = powershell,
        Arguments = arguments,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true,
    },
};
process.OutputDataReceived += (_, eventArgs) => { if (eventArgs.Data is not null) Console.WriteLine(eventArgs.Data); };
process.ErrorDataReceived += (_, eventArgs) => { if (eventArgs.Data is not null) Console.Error.WriteLine(eventArgs.Data); };
process.Start();
process.BeginOutputReadLine();
process.BeginErrorReadLine();
process.WaitForExit();
return process.ExitCode;
