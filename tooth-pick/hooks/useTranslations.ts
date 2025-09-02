import { useLocale } from 'next-intl';

// Simple translations hook - can be expanded with actual i18n
export function useTranslations(namespace?: string) {
  const locale = useLocale() || 'es';
  
  // Simple translation function for now
  function t(key: string, params?: Record<string, any>): string {
    // Fallback translations
    const translations: Record<string, Record<string, string>> = {
      es: {
        'download': 'Descargar',
        'processing': 'Procesando...',
        'export': 'Exportar',
        'backup': 'Backup',
        'collections': 'Colecciones',
        'format': 'Formato',
        'date': 'Fecha',
        'id': 'ID',
        'status': 'Estado',
        'actions': 'Acciones',
        'create': 'Crear',
        'delete': 'Eliminar',
        'edit': 'Editar',
        'save': 'Guardar',
        'cancel': 'Cancelar',
        'confirm': 'Confirmar',
        'loading': 'Cargando...',
        'error': 'Error',
        'success': 'Éxito',
        'warning': 'Advertencia',
        'info': 'Información'
      },
      en: {
        'download': 'Download',
        'processing': 'Processing...',
        'export': 'Export',
        'backup': 'Backup',
        'collections': 'Collections',
        'format': 'Format',
        'date': 'Date',
        'id': 'ID',
        'status': 'Status',
        'actions': 'Actions',
        'create': 'Create',
        'delete': 'Delete',
        'edit': 'Edit',
        'save': 'Save',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'loading': 'Loading...',
        'error': 'Error',
        'success': 'Success',
        'warning': 'Warning',
        'info': 'Information'
      },
      pt: {
        'download': 'Baixar',
        'processing': 'Processando...',
        'export': 'Exportar',
        'backup': 'Backup',
        'collections': 'Coleções',
        'format': 'Formato',
        'date': 'Data',
        'id': 'ID',
        'status': 'Status',
        'actions': 'Ações',
        'create': 'Criar',
        'delete': 'Excluir',
        'edit': 'Editar',
        'save': 'Salvar',
        'cancel': 'Cancelar',
        'confirm': 'Confirmar',
        'loading': 'Carregando...',
        'error': 'Erro',
        'success': 'Sucesso',
        'warning': 'Aviso',
        'info': 'Informação'
      }
    };

    const localeTranslations = translations[locale] || translations['es'];
    let translation = localeTranslations[key] || key;

    // Simple parameter replacement
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{${param}}`, String(value));
      });
    }

    return translation;
  }

  return t;
}