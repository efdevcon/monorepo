export type Severity = "ERROR" | "WARN" | "INFO";
export type Diagnostic = { severity: Severity; file: string; id: string | null; message: string };

/** Collects what the build has to say, grouped by severity, printed once at the end. */
export class Report {
  readonly items: Diagnostic[] = [];
  constructor(private readonly verbose: boolean) {}
  error(file: string, id: string | null, message: string) {
    this.items.push({ severity: "ERROR", file, id, message });
  }
  warn(file: string, id: string | null, message: string) {
    this.items.push({ severity: "WARN", file, id, message });
  }
  info(file: string, id: string | null, message: string) {
    this.items.push({ severity: "INFO", file, id, message });
  }
  get errors() {
    return this.items.filter((d) => d.severity === "ERROR");
  }
  print() {
    for (const severity of ["ERROR", "WARN", "INFO"] as const) {
      const list = this.items.filter((d) => d.severity === severity);
      if (!list.length || (severity === "INFO" && !this.verbose)) continue;
      console.log(`\n${severity} (${list.length})`);
      for (const d of list) console.log(`  ${d.file}${d.id ? `#${d.id}` : ""}: ${d.message}`);
    }
  }
}
