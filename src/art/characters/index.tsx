import type { CharId, Face } from '@/content/characters'
import { useArtManifest } from '../manifest'
import { HareSprite } from './Hare'
import { KuroSprite } from './Kuro'
import { MiraiSprite } from './Mirai'
import { RinSprite } from './Rin'
import { SenseiSprite } from './Sensei'

export interface CharacterSpriteProps {
  id: CharId
  face: Face
  speaking?: boolean
}

/**
 * PUBLIC ART INTERFACE.
 * Renders in a 600x1000 box (aspect 0.6). Uses /art/<id>/<face>.png when listed in public/art/manifest.json.
 */
export function CharacterSprite({ id, face, speaking }: CharacterSpriteProps) {
  const manifest = useArtManifest()
  if (manifest[`${id}/${face}`]) {
    return <img src={`/art/${id}/${face}.png`} alt="" draggable={false} style={{ height: '100%', width: 'auto' }} />
  }
  switch (id) {
    case 'rin':
      return <RinSprite face={face} speaking={speaking} />
    case 'hare':
      return <HareSprite face={face} speaking={speaking} />
    case 'mirai':
      return <MiraiSprite face={face} speaking={speaking} />
    case 'sensei':
      return <SenseiSprite face={face} speaking={speaking} />
    case 'kuro':
      return <KuroSprite face={face} speaking={speaking} />
  }
}
