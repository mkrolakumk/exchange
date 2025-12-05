from enum import Enum

class TradeType(str, Enum):
	BUY = "BUY"
	SELL = "SELL"