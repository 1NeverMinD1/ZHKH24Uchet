import "./_Tutorial.scss";

export default function Tutorial() {
  return (
    <div className="tutorial">
      <h2 className="tutorial__title">Как работать с сервисом</h2>
      <div className="tutorial__blocks">
        <div className="tutorial__blocks-block">
          <p className="tutorial__blocks-block-num">01</p>
          <p className="tutorial__blocks-block-intro">
            Введите БИН или название
          </p>
          <p className="tutorial__blocks-block-text">
            Поиск работает по любому идентификатору — названию компании, БИН,
            ИИН руководителя.
          </p>
        </div>
        <div className="tutorial__blocks-block">
          <p className="tutorial__blocks-block-num">02</p>
          <p className="tutorial__blocks-block-intro">
            Изучите карточку компании
          </p>
          <p className="tutorial__blocks-block-text">
            Руководитель, юридический адрес, вид деятельности, статус и дата
            регистрации — на одной странице.
          </p>
        </div>
        <div className="tutorial__blocks-block">
          <p className="tutorial__blocks-block-num">03</p>
          <p className="tutorial__blocks-block-intro">Примите решение</p>
          <p className="tutorial__blocks-block-text">
            Проверьте благонадёжность партнёра перед сделкой, не выходя из
            сервиса.
          </p>
        </div>
      </div>
    </div>
  );
}
