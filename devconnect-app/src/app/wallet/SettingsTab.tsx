import { LanguageSwitcher } from '@/i18n/language-switcher';
import cn from 'classnames';
import { ArrowUpRight } from 'lucide-react';
import { Icon } from '@mdi/react';
import { mdiTranslate, mdiBug } from '@mdi/js';
import { Separator } from 'lib/components/ui/separator';

export default function SettingsTab() {
  return (
    <div
      className={cn(
        'w-full py-4 sm:py-5 px-4 sm:px-6 mx-auto grow',
        'bg-[rgba(246,250,254,1)] grow pb-8'
      )}
    >
      <div className="text-lg font-semibold flex items-center gap-2">App</div>

      <div className="flex flex-col gap-4 mt-6">
        <div className="flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Icon path={mdiTranslate} size={1} className="" />
            <div className="text-sm font-semibold">Language</div>
          </div>
          <LanguageSwitcher />
        </div>
        <Separator className="" />

        <div className="flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Icon path={mdiBug} size={1} className="" />
            <div className="text-sm font-semibold">Provide Feedback</div>
          </div>
          <ArrowUpRight className="size-5" />
        </div>
        <Separator className="" />
      </div>

      <div className="text-lg font-semibold flex items-center gap-2 mt-4">
        Wallet
      </div>

      <div className="flex flex-col gap-2 mt-4 mb-4">
        <div className="flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Icon path={mdiTranslate} size={1} className="" />
            <div className="text-sm font-semibold">Something something</div>
          </div>
          <ArrowUpRight className="size-5 " />
        </div>
      </div>
    </div>
  );
}
