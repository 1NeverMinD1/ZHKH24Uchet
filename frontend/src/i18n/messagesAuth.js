export const authMessages = {
  ru: {
    "login.seoTitle": "Вход",
    "login.title": "Вход через ЭЦП",
    "login.edsText":
      "Войдите с помощью ЭЦП физического или юридического лица. При первом входе аккаунт создаётся автоматически.",
    "login.edsSubmit": "Войти через ЭЦП",
    "login.wait": "Подождите...",
    "login.ncalayerDownload": "Скачать NCALayer",
    "login.errors.NCALAYER_NOT_RUNNING":
      "NCALayer не запущен. Запустите NCALayer и повторите попытку.",
    "login.errors.NCALAYER_CLOSED":
      "Соединение с NCALayer прервано. Повторите попытку.",
    "login.errors.NCALAYER_ERROR":
      "NCALayer вернул ошибку. Проверьте ключ и пароль и повторите попытку.",
    "login.errors.CHALLENGE_EXPIRED":
      "Время на подпись истекло. Повторите попытку.",
    "login.errors.SIGNATURE_INVALID": "Подпись не прошла проверку.",
    "login.errors.CERT_NOT_FOUND": "В подписи не найден сертификат.",
    "login.errors.CERT_INVALID": "Сертификат недействителен или просрочен.",
    "login.errors.NOT_AUTH_KEY": "Этот ключ не подходит для входа.",
    "login.errors.CERT_REVOKED": "Сертификат отозван.",
    "login.errors.IIN_NOT_FOUND": "В сертификате не найден ИИН.",
    "login.errors.USER_BLOCKED": "Ваш аккаунт заблокирован администратором.",
    "login.errors.NCANODE_UNAVAILABLE":
      "Сервис проверки подписи временно недоступен. Попробуйте позже.",
    "login.errors.DEFAULT": "Не удалось войти. Повторите попытку.",

    "profile.seoTitle": "Личный профиль",
    "profile.loadError": "Не удалось загрузить профиль",
    "profile.memberSince": "В сервисе с {date}",
    "profile.personal": "Личные данные",
    "profile.edsHint":
      "ФИО и ИИН берутся из сертификата ЭЦП и обновляются при каждом входе.",
    "profile.lastName": "Фамилия",
    "profile.firstName": "Имя",
    "profile.middleName": "Отчество",
    "profile.iin": "ИИН",
    "profile.bin": "БИН",
    "profile.phone": "Номер телефона",
    "profile.phoneHint": "Формат: +7 777 123 45 67",
    "profile.save": "Сохранить",
    "profile.saving": "Сохранение...",
    "profile.saved": "Данные сохранены",
    "profile.saveError": "Не удалось сохранить данные",
    "profile.reset": "Отменить изменения",
    "profile.errors.INVALID_PHONE": "Укажите номер в формате +7 777 123 45 67",
    "profile.errors.PHONE_TAKEN": "Этот номер телефона уже используется",
    "profile.companiesTitle": "Компании",
    "profile.accessTitle": "Ваш доступ",
    "profile.accessText":
      "Вам доступны все сведения в карточках компаний: руководитель, адрес, дата регистрации и другие.",
    "profile.linksTitle": "Быстрые ссылки",
    "profile.linkCompanies": "Каталог компаний",
    "profile.linkSearch": "Поиск компании",
    "profile.logout": "Выйти из аккаунта",
  },
  kk: {
    "login.seoTitle": "Кіру",
    "login.title": "ЭЦҚ арқылы кіру",
    "login.edsText":
      "Жеке немесе заңды тұлғаның ЭЦҚ-сы арқылы кіріңіз. Алғаш кірген кезде аккаунт автоматты түрде жасалады.",
    "login.edsSubmit": "ЭЦҚ арқылы кіру",
    "login.wait": "Күте тұрыңыз...",
    "login.ncalayerDownload": "NCALayer жүктеп алу",
    "login.errors.NCALAYER_NOT_RUNNING":
      "NCALayer іске қосылмаған. NCALayer-ді іске қосып, қайталап көріңіз.",
    "login.errors.NCALAYER_CLOSED":
      "NCALayer-мен байланыс үзілді. Қайталап көріңіз.",
    "login.errors.NCALAYER_ERROR":
      "NCALayer қате қайтарды. Кілт пен құпиясөзді тексеріп, қайталап көріңіз.",
    "login.errors.CHALLENGE_EXPIRED":
      "Қол қою уақыты өтіп кетті. Қайталап көріңіз.",
    "login.errors.SIGNATURE_INVALID": "Қолтаңба тексеруден өтпеді.",
    "login.errors.CERT_NOT_FOUND": "Қолтаңбадан сертификат табылмады.",
    "login.errors.CERT_INVALID": "Сертификат жарамсыз немесе мерзімі өткен.",
    "login.errors.NOT_AUTH_KEY": "Бұл кілт жүйеге кіруге жарамайды.",
    "login.errors.CERT_REVOKED": "Сертификат кері шақырылған.",
    "login.errors.IIN_NOT_FOUND": "Сертификаттан ЖСН табылмады.",
    "login.errors.USER_BLOCKED": "Аккаунтыңызды әкімші бұғаттады.",
    "login.errors.NCANODE_UNAVAILABLE":
      "Қолтаңбаны тексеру қызметі уақытша қолжетімсіз. Кейінірек көріңіз.",
    "login.errors.DEFAULT": "Кіру мүмкін болмады. Қайталап көріңіз.",

    "profile.seoTitle": "Жеке профиль",
    "profile.loadError": "Профильді жүктеу мүмкін болмады",
    "profile.memberSince": "{date} бастап сервисте",
    "profile.personal": "Жеке деректер",
    "profile.edsHint":
      "Аты-жөні мен ЖСН ЭЦҚ сертификатынан алынады және әр кірген сайын жаңартылады.",
    "profile.lastName": "Тегі",
    "profile.firstName": "Аты",
    "profile.middleName": "Әкесінің аты",
    "profile.iin": "ЖСН",
    "profile.bin": "БСН",
    "profile.phone": "Телефон нөмірі",
    "profile.phoneHint": "Формат: +7 777 123 45 67",
    "profile.save": "Сақтау",
    "profile.saving": "Сақталуда...",
    "profile.saved": "Деректер сақталды",
    "profile.saveError": "Деректерді сақтау мүмкін болмады",
    "profile.reset": "Өзгерістерді болдырмау",
    "profile.errors.INVALID_PHONE":
      "Нөмірді +7 777 123 45 67 форматында көрсетіңіз",
    "profile.errors.PHONE_TAKEN": "Бұл телефон нөмірі қолданыста",
    "profile.companiesTitle": "Компаниялар",
    "profile.accessTitle": "Сіздің қолжетімділігіңіз",
    "profile.accessText":
      "Компания карточкаларындағы барлық мәліметтер қолжетімді: басшы, мекенжай, тіркелген күні және басқалары.",
    "profile.linksTitle": "Жылдам сілтемелер",
    "profile.linkCompanies": "Компаниялар каталогы",
    "profile.linkSearch": "Компанияны іздеу",
    "profile.logout": "Аккаунттан шығу",
  },
};
