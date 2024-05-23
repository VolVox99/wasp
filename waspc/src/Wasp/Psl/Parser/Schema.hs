module Wasp.Psl.Parser.Schema
  ( parsePrismaSchema,
    -- For testing only
    schema,
  )
where

import Text.Parsec
  ( many,
    try,
    (<|>),
  )
import qualified Text.Parsec as Parsec
import Text.Parsec.String (Parser)
import qualified Wasp.Psl.Ast.Schema as Model
import Wasp.Psl.Parser.Common (whiteSpace)
import Wasp.Psl.Parser.ConfigBlock (configBlock)
import Wasp.Psl.Parser.Enum (enum)
import Wasp.Psl.Parser.Model (model)

parsePrismaSchema :: String -> Either String Model.Schema
parsePrismaSchema input = case Parsec.parse schema "" input of
  Left err -> Left $ show err
  Right parsedSchema -> Right parsedSchema

schema :: Parser Model.Schema
schema = do
  whiteSpace
  elements <-
    many
      ( try model
          <|> try enum
          <|> try configBlock
      )
  return $ Model.Schema elements
