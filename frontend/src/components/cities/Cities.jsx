import "./_Cities.scss";

export default function Cities() {
  return (
    <div className="sities">
      <div className="sities__intro">
        <h2 className="sities__intro-title">Предприятия по городам</h2>
        <p className="sities__intro-all">Все населённые пункты</p>
      </div>

      <div className="sities__blocks">
        <div className="sities__blocks-block">
          <div className="sities__blocks-block-left">
            <p className="sities__blocks-block-num">1</p>
            <p className="sities__blocks-block-left-intro">Алматы</p>
          </div>
          <div className="sities__blocks-block-right">
            <p className="sities__blocks-block-right-kat">KATO 750000000</p>
            <p className="sities__blocks-block-right-text">
              311 683 предприятий
            </p>
          </div>
        </div>
        <div className="sities__blocks-block">
          <div className="sities__blocks-block-left">
            <p className="sities__blocks-block-num">2</p>
            <p className="sities__blocks-block-left-intro">Астана</p>
          </div>
          <div className="sities__blocks-block-right">
            <p className="sities__blocks-block-right-kat">KATO 710000000</p>
            <p className="sities__blocks-block-right-text">
              212 062 предприятий
            </p>
          </div>
        </div>
        <div className="sities__blocks-block">
          <div className="sities__blocks-block-left">
            <p className="sities__block-block-left-num">3</p>
            <p className="sities__blocks-block-left-intro">Шымкент</p>
          </div>
          <div className="sities__blocks-block-right">
            <p className="sities__blocks-block-right-kat">KATO 790000000</p>
            <p className="sities__blocks-block-right-text">
              84 977 предприятий
            </p>
          </div>
        </div>
        <div className="sities__blocks-block">
          <div className="sities__blocks-block-left">
            <p className="sities__block-block-left-num">4</p>
            <p className="sities__blocks-block-left-intro">Актау</p>
          </div>
          <div className="sities__blocks-block-right">
            <p className="sities__blocks-block-right-kat">KATO 471010000</p>
            <p className="sities__blocks-block-right-text">
              35 096 предприятий
            </p>
          </div>
        </div>
        <div className="sities__blocks-block">
          <div className="sities__blocks-block-left">
            <p className="sities__block-block-left-num">5</p>
            <p className="sities__blocks-block-left-intro">Атырау</p>
          </div>
          <div className="sities__blocks-block-right">
            <p className="sities__blocks-block-right-kat">KATO 231010000</p>
            <p className="sities__blocks-block-right-text">
              31 838 предприятий
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
