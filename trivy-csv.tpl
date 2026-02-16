Target,Type,Class,Package,InstalledVersion,FixedVersion,Identifier,Severity,Title
{{- range . }}
{{- $target := .Target }}
{{- $type := .Type }}
{{- $class := .Class }}
{{- range .Vulnerabilities }}
{{ printf "%s,%s,%s,%s,%s,%s,%s,%s,%q" $target $type $class .PkgName .InstalledVersion (or .FixedVersion "") .VulnerabilityID .Severity .Title }}
{{"\n"}}
{{- end }}
{{- range .Misconfigurations }}
{{ printf "%s,%s,%s,%s,%s,%s,%s,%s,%q" $target $type "misconfiguration" .ID .CurrentValue (or .ExpectedValue "") .PrimaryURL .Severity .Title }}
{{"\n"}}
{{- end }}
{{- end }}
