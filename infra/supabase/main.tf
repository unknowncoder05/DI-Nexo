terraform {
  required_version = ">= 1.10, < 2.0"
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "1.10.1"
    }
  }
}

# El token se proporciona con SUPABASE_ACCESS_TOKEN, nunca en el repositorio.
provider "supabase" {}

resource "supabase_project" "nexo" {
  organization_id   = var.organization_id
  name              = var.project_name
  database_password = var.database_password
  region            = var.region

  lifecycle {
    prevent_destroy = true
    # La API no devuelve esta contraseña: evitar rotarla al importar.
    ignore_changes = [database_password]
  }
}

import {
  for_each = var.existing_project_ref == null ? [] : [var.existing_project_ref]
  to       = supabase_project.nexo
  id       = each.value
}

# Las cuentas se provisionan explícitamente: no hay registro público abierto.
resource "supabase_settings" "auth" {
  project_ref = supabase_project.nexo.id
  auth = jsonencode({
    disable_signup = true
  })
}
