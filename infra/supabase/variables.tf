variable "organization_id" {
  description = "ID de la organización de Supabase propietaria del proyecto."
  type        = string
  nullable    = false
  validation {
    condition     = length(trimspace(var.organization_id)) > 0
    error_message = "Indica el ID de la organización."
  }
}
variable "project_name" {
  type    = string
  default = "nexo-actividad-1"
}
variable "region" {
  description = "Región de Supabase para el nuevo proyecto."
  type        = string
  default     = "eu-west-1"
}
variable "database_password" {
  description = "Contraseña PostgreSQL. Proporcionar mediante TF_VAR_database_password."
  type        = string
  sensitive   = true
  nullable    = false
  validation {
    condition     = length(var.database_password) >= 12
    error_message = "Utiliza una contraseña aleatoria de al menos 12 caracteres."
  }
}
variable "existing_project_ref" {
  description = "Referencia de un proyecto creado en el panel, para importarlo sin duplicarlo. null crea uno nuevo."
  type        = string
  default     = null
}
