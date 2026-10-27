output "project_ref" {
  value = supabase_project.nexo.id
}
output "supabase_url" {
  value = "https://${supabase_project.nexo.id}.supabase.co"
}
