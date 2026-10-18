import type { Locale } from '@/lib/cms/types'
import { formatNumber } from '@/lib/runtime'

/**
 * Interface strings. Persian first, English second — chrome only, content lives in CMS.
 *
 * Anything a customer could want to reword is *not* here: it belongs in a page, a block
 * or the site's branding. These are the labels of controls the theme owns (share, close,
 * next work, loading states), so they are the only strings that ship inside the image.
 */
type Dictionary = {
  about: string
  allProjects: string
  biography: string
  breadcrumb: string
  browseProjects: string
  close: string
  copied: string
  copy: string
  copyLink: string
  contact: string
  contactDetailsMissing: string
  contactFormMissingBody: string
  contactFormMissingTitle: string
  contactFormMissingUseDetails: string
  email: string
  emptyArchiveBody: string
  emptyArchiveTitle: string
  enter: string
  errorBody: string
  errorTitle: string
  factArea: string
  factClient: string
  factCollaborators: string
  factDate: string
  factLocation: string
  factStatus: string
  featured: string
  formError: string
  formPending: string
  formSuccess: string
  gallery: string
  holdingBody: string
  holdingTitle: string
  home: string
  hours: string
  inquiry: string
  languageSwitch: string
  loading: string
  map: string
  menu: string
  menuTitle: string
  missingContentBody: string
  missingContentTitle: string
  next: string
  nextProject: string
  notFoundBody: string
  notFoundTitle: string
  openBiography: string
  openWork: (title: string) => string
  phone: string
  photo: string
  photoAt: (position: number, total: number) => string
  previous: string
  projectFacts: string
  projectKicker: (position: number, total: number) => string
  projects: string
  relatedWork: string
  reload: string
  selectedWork: string
  selectedWorkCount: (total: number) => string
  selectedWorkShown: (shown: number, total: number) => string
  share: string
  shareDone: string
  shareFailed: string
  showMap: string
  openMap: string
  skipToContent: string
  startConversation: string
  team: string
  unreachableBody: string
  unreachableTitle: string
}

const fa: Dictionary = {
  about: 'درباره ما',
  allProjects: 'همهٔ نمونه‌کارها',
  biography: 'زندگینامه',
  breadcrumb: 'مسیر صفحه',
  browseProjects: 'دیدن نمونه‌کارها',
  close: 'بستن',
  copied: 'کپی شد',
  copy: 'کپی',
  copyLink: 'کپی پیوند',
  contact: 'تماس',
  contactDetailsMissing: 'اطلاعات تماس هنوز منتشر نشده است.',
  contactFormMissingBody: 'فرم تماس هنوز برای این زبان منتشر نشده است.',
  contactFormMissingTitle: 'فرم تماس در دسترس نیست',
  contactFormMissingUseDetails: 'فرم تماس هنوز منتشر نشده است؛ از راه‌های تماسِ همین صفحه استفاده کنید.',
  email: 'ایمیل',
  emptyArchiveBody: 'به‌زودی در این بخش اثر تازه‌ای منتشر می‌شود.',
  emptyArchiveTitle: 'هنوز چیزی منتشر نشده است',
  enter: 'ورود',
  errorBody: 'نمایش این بخش ممکن نشد. می‌توانید دوباره تلاش کنید.',
  errorTitle: 'خطا در بارگذاری',
  factArea: 'مساحت',
  factClient: 'کارفرما',
  factCollaborators: 'همکاران',
  factDate: 'تاریخ',
  factLocation: 'مکان',
  factStatus: 'وضعیت',
  featured: 'شاخص',
  formError: 'ارسال فرم انجام نشد. مقادیر وارد‌شده حفظ شده‌اند؛ دوباره تلاش کنید.',
  formPending: 'در حال ارسال…',
  formSuccess: 'پیام شما ثبت شد.',
  gallery: 'تصاویر',
  holdingBody: 'در حال حاضر امکان نمایش محتوای این سایت وجود ندارد.',
  holdingTitle: 'این سایت موقتاً در دسترس نیست',
  home: 'خانه',
  hours: 'ساعات کاری',
  inquiry: 'استعلام درباره این اثر',
  languageSwitch: 'زبان',
  loading: 'در حال بارگذاری…',
  map: 'نقشه',
  menu: 'فهرست',
  menuTitle: 'فهرست سایت',
  missingContentBody: 'مدیر سایت هنوز این بخش را در CMS پیوند نداده است.',
  missingContentTitle: 'محتوای این بخش هنوز تنظیم نشده است',
  next: 'بعدی',
  nextProject: 'اثر بعدی',
  notFoundBody: 'نشانی درخواستی در این سایت وجود ندارد.',
  notFoundTitle: 'صفحه پیدا نشد',
  openBiography: 'خواندن زندگینامه',
  openWork: (title) => `باز کردن ${title}`,
  phone: 'تلفن',
  photo: 'تصویر',
  photoAt: (position, total) => `تصویر ${formatNumber(position, 'fa')} از ${formatNumber(total, 'fa')}`,
  previous: 'پیشین',
  projectFacts: 'مشخصات اثر',
  projectKicker: (position, total) => `اثر ${formatNumber(position, 'fa')} از ${formatNumber(total, 'fa')}`,
  projects: 'نمونه‌کارها',
  relatedWork: 'آثار مرتبط',
  reload: 'تلاش دوباره',
  selectedWork: 'نمونه کارها',
  selectedWorkCount: (total) => `${formatNumber(total, 'fa')} اثر`,
  selectedWorkShown: (shown, total) => `${formatNumber(shown, 'fa')} از ${formatNumber(total, 'fa')}`,
  share: 'اشتراک‌گذاری',
  shareDone: 'پیوند کپی شد.',
  shareFailed: 'اشتراک‌گذاری انجام نشد؛ پیوند را دستی کپی کنید.',
  showMap: 'نمایش نقشه',
  openMap: 'باز کردن در نقشه',
  skipToContent: 'رفتن به محتوا',
  startConversation: 'گفتگو را شروع کنیم',
  team: 'تیم',
  unreachableBody: 'این نسخه به CMS متصل نیست. تنظیمات اتصال را بررسی کنید.',
  unreachableTitle: 'اتصال به سامانهٔ محتوا برقرار نشد',
}

const en: Dictionary = {
  about: 'About',
  allProjects: 'All work',
  biography: 'Biography',
  breadcrumb: 'Breadcrumb',
  browseProjects: 'Browse the work',
  close: 'Close',
  copied: 'Copied',
  copy: 'Copy',
  copyLink: 'Copy link',
  contact: 'Contact',
  contactDetailsMissing: 'Contact details have not been published yet.',
  contactFormMissingBody: 'The contact form has not been published in English yet.',
  contactFormMissingTitle: 'The contact form is not available',
  contactFormMissingUseDetails: 'The contact form has not been published yet; please use the contact details on this page.',
  email: 'Email',
  emptyArchiveBody: 'New work will be published here soon.',
  emptyArchiveTitle: 'Nothing published yet',
  enter: 'Enter',
  errorBody: 'This section could not be displayed. Try again.',
  errorTitle: 'Loading error',
  factArea: 'Area',
  factClient: 'Client',
  factCollaborators: 'Collaborators',
  factDate: 'Date',
  factLocation: 'Location',
  factStatus: 'Status',
  featured: 'Featured',
  formError: 'The form could not be sent. Your input was kept — try again.',
  formPending: 'Sending…',
  formSuccess: 'Your message was received.',
  gallery: 'Gallery',
  holdingBody: 'Its content cannot be displayed right now.',
  holdingTitle: 'This site is temporarily unavailable',
  home: 'Home',
  hours: 'Hours',
  inquiry: 'Enquire about this work',
  languageSwitch: 'Language',
  loading: 'Loading…',
  map: 'Map',
  menu: 'Menu',
  menuTitle: 'Site menu',
  missingContentBody: 'The site manager has not linked this section in the CMS.',
  missingContentTitle: 'This section is not configured yet',
  next: 'Next',
  nextProject: 'Next project',
  notFoundBody: 'The requested address does not exist on this site.',
  notFoundTitle: 'Page not found',
  openBiography: 'Read biography',
  openWork: (title) => `Open ${title}`,
  phone: 'Phone',
  photo: 'Photograph',
  photoAt: (position, total) => `Photograph ${formatNumber(position, 'en')} of ${formatNumber(total, 'en')}`,
  previous: 'Previous',
  projectFacts: 'Work facts',
  projectKicker: (position, total) => `Project ${position} of ${total}`,
  projects: 'Work',
  relatedWork: 'Related work',
  reload: 'Try again',
  selectedWork: 'Selected work',
  selectedWorkCount: (total) => `${formatNumber(total, 'en')} ${total === 1 ? 'work' : 'works'}`,
  selectedWorkShown: (shown, total) => `${formatNumber(shown, 'en')} of ${formatNumber(total, 'en')}`,
  share: 'Share',
  shareDone: 'Link copied.',
  shareFailed: 'Sharing failed; copy the link manually.',
  showMap: 'Show map',
  openMap: 'Open in maps',
  skipToContent: 'Skip to content',
  startConversation: 'Start a conversation',
  team: 'Team',
  unreachableBody: 'This deployment is not connected to the CMS. Check the connection settings.',
  unreachableTitle: 'The content system could not be reached',
}

const dictionaries: Record<Locale, Dictionary> = { en, fa }
export const labels = (locale: Locale): Dictionary => dictionaries[locale] ?? fa
export type { Dictionary }
